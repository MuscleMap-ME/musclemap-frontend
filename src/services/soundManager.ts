/**
 * Sound Manager Service
 *
 * Manages app-wide sound effects with support for:
 * - Sound packs (default, energetic, calm, gaming, military)
 * - Volume control
 * - Preloading and caching
 * - Web Audio API for precise timing
 *
 * @example
 * const soundManager = getSoundManager();
 * await soundManager.loadPack('default');
 * soundManager.play('timer_complete');
 */

export type SoundType =
  | 'timer_complete'
  | 'timer_warning'
  | 'rep_count'
  | 'set_complete'
  | 'workout_complete'
  | 'achievement_unlock'
  | 'level_up'
  | 'xp_gain'
  | 'error'
  | 'success'
  | 'notification'
  | 'hydration_reminder'
  | 'rest_start'
  | 'rest_end'
  | 'countdown_tick'
  | 'countdown_final';

export interface SoundPack {
  id: string;
  name: string;
  description?: string;
  sounds: Record<SoundType, SoundDefinition>;
}

export interface SoundDefinition {
  type: 'oscillator' | 'sample';
  // For oscillator type
  frequency?: number;
  waveform?: OscillatorType;
  duration?: number;
  envelope?: {
    attack?: number;
    decay?: number;
    sustain?: number;
    release?: number;
  };
  // For sample type
  url?: string;
}

// ============================================
// DEFAULT SOUND PACKS
// ============================================

const DEFAULT_SOUNDS: Record<SoundType, SoundDefinition> = {
  timer_complete: {
    type: 'oscillator',
    frequency: 880,
    waveform: 'sine',
    duration: 0.3,
    envelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.2 },
  },
  timer_warning: {
    type: 'oscillator',
    frequency: 440,
    waveform: 'sine',
    duration: 0.15,
    envelope: { attack: 0.01, decay: 0.05, sustain: 0.5, release: 0.1 },
  },
  rep_count: {
    type: 'oscillator',
    frequency: 600,
    waveform: 'sine',
    duration: 0.1,
    envelope: { attack: 0.01, decay: 0.05, sustain: 0.3, release: 0.05 },
  },
  set_complete: {
    type: 'oscillator',
    frequency: 1000,
    waveform: 'sine',
    duration: 0.4,
    envelope: { attack: 0.01, decay: 0.1, sustain: 0.6, release: 0.3 },
  },
  workout_complete: {
    type: 'oscillator',
    frequency: 1200,
    waveform: 'sine',
    duration: 0.5,
    envelope: { attack: 0.02, decay: 0.15, sustain: 0.7, release: 0.35 },
  },
  achievement_unlock: {
    type: 'oscillator',
    frequency: 1400,
    waveform: 'sine',
    duration: 0.6,
    envelope: { attack: 0.02, decay: 0.2, sustain: 0.8, release: 0.4 },
  },
  level_up: {
    type: 'oscillator',
    frequency: 1600,
    waveform: 'sine',
    duration: 0.7,
    envelope: { attack: 0.03, decay: 0.25, sustain: 0.85, release: 0.45 },
  },
  xp_gain: {
    type: 'oscillator',
    frequency: 700,
    waveform: 'sine',
    duration: 0.15,
    envelope: { attack: 0.01, decay: 0.05, sustain: 0.4, release: 0.1 },
  },
  error: {
    type: 'oscillator',
    frequency: 200,
    waveform: 'sawtooth',
    duration: 0.3,
    envelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.2 },
  },
  success: {
    type: 'oscillator',
    frequency: 900,
    waveform: 'sine',
    duration: 0.25,
    envelope: { attack: 0.01, decay: 0.08, sustain: 0.5, release: 0.17 },
  },
  notification: {
    type: 'oscillator',
    frequency: 800,
    waveform: 'sine',
    duration: 0.2,
    envelope: { attack: 0.01, decay: 0.06, sustain: 0.4, release: 0.14 },
  },
  hydration_reminder: {
    type: 'oscillator',
    frequency: 750,
    waveform: 'sine',
    duration: 0.25,
    envelope: { attack: 0.02, decay: 0.08, sustain: 0.5, release: 0.15 },
  },
  rest_start: {
    type: 'oscillator',
    frequency: 500,
    waveform: 'sine',
    duration: 0.3,
    envelope: { attack: 0.02, decay: 0.1, sustain: 0.5, release: 0.2 },
  },
  rest_end: {
    type: 'oscillator',
    frequency: 800,
    waveform: 'sine',
    duration: 0.3,
    envelope: { attack: 0.02, decay: 0.1, sustain: 0.5, release: 0.2 },
  },
  countdown_tick: {
    type: 'oscillator',
    frequency: 600,
    waveform: 'sine',
    duration: 0.08,
    envelope: { attack: 0.01, decay: 0.03, sustain: 0.3, release: 0.04 },
  },
  countdown_final: {
    type: 'oscillator',
    frequency: 1000,
    waveform: 'sine',
    duration: 0.15,
    envelope: { attack: 0.01, decay: 0.05, sustain: 0.5, release: 0.1 },
  },
};

// Alternative packs with different frequencies/characteristics
const ENERGETIC_SOUNDS: Record<SoundType, SoundDefinition> = {
  ...DEFAULT_SOUNDS,
  timer_complete: { ...DEFAULT_SOUNDS.timer_complete, frequency: 1000, waveform: 'square' },
  set_complete: { ...DEFAULT_SOUNDS.set_complete, frequency: 1200, waveform: 'square' },
  workout_complete: { ...DEFAULT_SOUNDS.workout_complete, frequency: 1400, waveform: 'square' },
};

const CALM_SOUNDS: Record<SoundType, SoundDefinition> = {
  ...DEFAULT_SOUNDS,
  timer_complete: { ...DEFAULT_SOUNDS.timer_complete, frequency: 600, duration: 0.5 },
  notification: { ...DEFAULT_SOUNDS.notification, frequency: 500, duration: 0.4 },
};

const GAMING_SOUNDS: Record<SoundType, SoundDefinition> = {
  ...DEFAULT_SOUNDS,
  timer_complete: { ...DEFAULT_SOUNDS.timer_complete, frequency: 1100, waveform: 'square' },
  achievement_unlock: { ...DEFAULT_SOUNDS.achievement_unlock, frequency: 1600, waveform: 'square' },
  level_up: { ...DEFAULT_SOUNDS.level_up, frequency: 1800, waveform: 'square' },
  xp_gain: { ...DEFAULT_SOUNDS.xp_gain, frequency: 800, waveform: 'square' },
};

const MILITARY_SOUNDS: Record<SoundType, SoundDefinition> = {
  ...DEFAULT_SOUNDS,
  timer_complete: { ...DEFAULT_SOUNDS.timer_complete, frequency: 700, waveform: 'triangle' },
  countdown_tick: { ...DEFAULT_SOUNDS.countdown_tick, frequency: 500, waveform: 'triangle' },
  rest_end: { ...DEFAULT_SOUNDS.rest_end, frequency: 900, waveform: 'triangle' },
};

const SOUND_PACKS: Record<string, SoundPack> = {
  default: { id: 'default', name: 'Default', description: 'Clean, balanced sounds', sounds: DEFAULT_SOUNDS },
  energetic: { id: 'energetic', name: 'Energetic', description: 'Punchy, motivating sounds', sounds: ENERGETIC_SOUNDS },
  calm: { id: 'calm', name: 'Calm', description: 'Soft, relaxing sounds', sounds: CALM_SOUNDS },
  gaming: { id: 'gaming', name: 'Gaming', description: '8-bit style sounds', sounds: GAMING_SOUNDS },
  military: { id: 'military', name: 'Military', description: 'Sharp, commanding sounds', sounds: MILITARY_SOUNDS },
};

// ============================================
// SOUND MANAGER CLASS
// ============================================

export class SoundManager {
  private audioContext: AudioContext | null = null;
  private masterVolume = 0.7;
  private enabled = true;
  private currentPackId = 'default';
  private loadedSamples: Map<string, AudioBuffer> = new Map();
  private lastPlayTime: Map<SoundType, number> = new Map();
  private minPlayInterval = 50; // ms between same sounds to prevent spam

  constructor() {
    // Initialize audio context on first user interaction
    this.initOnInteraction();
  }

  // ============================================
  // PUBLIC API
  // ============================================

  /**
   * Play a sound
   */
  play(sound: SoundType, volume?: number): void {
    if (!this.enabled) return;

    // Debounce rapid plays of the same sound
    const now = Date.now();
    const lastPlay = this.lastPlayTime.get(sound) || 0;
    if (now - lastPlay < this.minPlayInterval) return;
    this.lastPlayTime.set(sound, now);

    // Ensure audio context is ready
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const pack = SOUND_PACKS[this.currentPackId] || SOUND_PACKS.default;
    const soundDef = pack.sounds[sound];

    if (!soundDef) return;

    const effectiveVolume = (volume ?? 1) * this.masterVolume;

    if (soundDef.type === 'oscillator') {
      this.playOscillator(soundDef, effectiveVolume);
    } else if (soundDef.type === 'sample' && soundDef.url) {
      this.playSample(soundDef.url, effectiveVolume);
    }
  }

  /**
   * Play a sequence of sounds (e.g., for workout complete fanfare)
   */
  async playSequence(sounds: Array<{ sound: SoundType; delay: number; volume?: number }>): Promise<void> {
    for (const { sound, delay, volume } of sounds) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      this.play(sound, volume);
    }
  }

  /**
   * Play countdown (3, 2, 1, GO!)
   */
  playCountdown(): void {
    this.playSequence([
      { sound: 'countdown_tick', delay: 0 },
      { sound: 'countdown_tick', delay: 1000 },
      { sound: 'countdown_tick', delay: 1000 },
      { sound: 'countdown_final', delay: 1000 },
    ]);
  }

  /**
   * Set master volume (0-1)
   */
  setVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.masterVolume;
  }

  /**
   * Enable/disable all sounds
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if sounds are enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Set current sound pack
   */
  setPack(packId: string): void {
    if (SOUND_PACKS[packId]) {
      this.currentPackId = packId;
    }
  }

  /**
   * Get current sound pack ID
   */
  getCurrentPack(): string {
    return this.currentPackId;
  }

  /**
   * Get available sound packs
   */
  getAvailablePacks(): Array<{ id: string; name: string; description?: string }> {
    return Object.values(SOUND_PACKS).map(({ id, name, description }) => ({
      id,
      name,
      description,
    }));
  }

  /**
   * Preload a sample sound
   */
  async loadSample(url: string): Promise<void> {
    if (this.loadedSamples.has(url)) return;

    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.loadedSamples.set(url, audioBuffer);
    } catch (error) {
      console.error('Failed to load sound sample:', url, error);
    }
  }

  /**
   * Test a sound (for settings preview)
   */
  testSound(sound: SoundType): void {
    this.play(sound);
  }

  /**
   * Test current pack with a sequence
   */
  testPack(): void {
    this.playSequence([
      { sound: 'notification', delay: 0 },
      { sound: 'timer_complete', delay: 400 },
      { sound: 'success', delay: 400 },
    ]);
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.loadedSamples.clear();
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private initOnInteraction(): void {
    const initAudio = () => {
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }
      document.removeEventListener('click', initAudio);
      document.removeEventListener('touchstart', initAudio);
      document.removeEventListener('keydown', initAudio);
    };

    document.addEventListener('click', initAudio, { once: true });
    document.addEventListener('touchstart', initAudio, { once: true });
    document.addEventListener('keydown', initAudio, { once: true });
  }

  private playOscillator(def: SoundDefinition, volume: number): void {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = def.frequency || 440;
    oscillator.type = def.waveform || 'sine';

    const now = this.audioContext.currentTime;
    const duration = def.duration || 0.2;
    const envelope = def.envelope || {};

    const attack = envelope.attack || 0.01;
    const decay = envelope.decay || 0.1;
    const sustain = envelope.sustain || 0.5;
    const release = envelope.release || 0.1;

    // ADSR envelope
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + attack);
    gainNode.gain.linearRampToValueAtTime(volume * sustain, now + attack + decay);
    gainNode.gain.setValueAtTime(volume * sustain, now + duration - release);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);

    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  private playSample(url: string, volume: number): void {
    if (!this.audioContext) return;

    const buffer = this.loadedSamples.get(url);
    if (!buffer) {
      // Load and play
      this.loadSample(url).then(() => {
        this.playSample(url, volume);
      });
      return;
    }

    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();

    source.buffer = buffer;
    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    gainNode.gain.value = volume;
    source.start();
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let globalSoundManager: SoundManager | null = null;

export function getSoundManager(): SoundManager {
  if (!globalSoundManager) {
    globalSoundManager = new SoundManager();
  }
  return globalSoundManager;
}

export function disposeSoundManager(): void {
  if (globalSoundManager) {
    globalSoundManager.dispose();
    globalSoundManager = null;
  }
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Quick play a sound using the global manager
 */
export function playSound(sound: SoundType, volume?: number): void {
  getSoundManager().play(sound, volume);
}

/**
 * Play timer completion sound
 */
export function playTimerComplete(): void {
  playSound('timer_complete');
}

/**
 * Play rep count sound
 */
export function playRepCount(): void {
  playSound('rep_count');
}

/**
 * Play set complete sound
 */
export function playSetComplete(): void {
  playSound('set_complete');
}

/**
 * Play workout complete fanfare
 */
export function playWorkoutComplete(): void {
  const manager = getSoundManager();
  manager.playSequence([
    { sound: 'workout_complete', delay: 0 },
    { sound: 'achievement_unlock', delay: 300, volume: 0.7 },
    { sound: 'success', delay: 300, volume: 0.5 },
  ]);
}

/**
 * Play achievement unlock sound
 */
export function playAchievementUnlock(): void {
  playSound('achievement_unlock');
}

/**
 * Play level up sound
 */
export function playLevelUp(): void {
  const manager = getSoundManager();
  manager.playSequence([
    { sound: 'level_up', delay: 0 },
    { sound: 'achievement_unlock', delay: 200, volume: 0.8 },
  ]);
}

/**
 * Play hydration reminder sound
 */
export function playHydrationReminder(): void {
  playSound('hydration_reminder');
}

/**
 * Play error sound
 */
export function playError(): void {
  playSound('error');
}

/**
 * Play success sound
 */
export function playSuccess(): void {
  playSound('success');
}

export default SoundManager;
