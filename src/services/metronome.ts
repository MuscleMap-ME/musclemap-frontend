/**
 * Metronome Service
 *
 * Provides precise timing for rep counting and tempo training.
 * Uses Web Audio API for accurate, drift-free timing.
 *
 * @example
 * const metronome = new Metronome();
 * metronome.setBpm(60);
 * metronome.start();
 * // ... later
 * metronome.stop();
 */

type TickCallback = (beat: number, time: number) => void;

export interface MetronomeOptions {
  bpm?: number;
  accentEvery?: number;
  volume?: number;
  tickFrequency?: number;
  accentFrequency?: number;
  onTick?: TickCallback;
}

export class Metronome {
  private audioContext: AudioContext | null = null;
  private isPlaying = false;
  private bpm = 60;
  private accentEvery = 4; // Accent every N beats
  private volume = 0.5;
  private tickFrequency = 800; // Hz for normal tick
  private accentFrequency = 1200; // Hz for accent tick
  private currentBeat = 0;
  private nextTickTime = 0;
  private schedulerTimerId: number | null = null;
  private onTickCallback: TickCallback | null = null;

  // Lookahead and scheduling settings
  private readonly lookahead = 25.0; // ms
  private readonly scheduleAheadTime = 0.1; // seconds

  constructor(options: MetronomeOptions = {}) {
    this.bpm = options.bpm ?? 60;
    this.accentEvery = options.accentEvery ?? 4;
    this.volume = options.volume ?? 0.5;
    this.tickFrequency = options.tickFrequency ?? 800;
    this.accentFrequency = options.accentFrequency ?? 1200;
    this.onTickCallback = options.onTick ?? null;
  }

  // ============================================
  // PUBLIC API
  // ============================================

  /**
   * Start the metronome
   */
  start(): void {
    if (this.isPlaying) return;

    // Create or resume audio context
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    this.isPlaying = true;
    this.currentBeat = 0;
    this.nextTickTime = this.audioContext.currentTime;

    this.scheduler();
  }

  /**
   * Stop the metronome
   */
  stop(): void {
    if (!this.isPlaying) return;

    this.isPlaying = false;
    if (this.schedulerTimerId !== null) {
      clearTimeout(this.schedulerTimerId);
      this.schedulerTimerId = null;
    }
  }

  /**
   * Toggle play/pause state
   */
  toggle(): void {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.start();
    }
  }

  /**
   * Set beats per minute
   */
  setBpm(bpm: number): void {
    this.bpm = Math.max(20, Math.min(300, bpm)); // Clamp between 20-300
  }

  /**
   * Get current BPM
   */
  getBpm(): number {
    return this.bpm;
  }

  /**
   * Set accent pattern (accent every N beats)
   */
  setAccent(every: number): void {
    this.accentEvery = Math.max(1, Math.min(16, every));
  }

  /**
   * Get current accent setting
   */
  getAccent(): number {
    return this.accentEvery;
  }

  /**
   * Set volume (0-1)
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * Set tick callback
   */
  onTick(callback: TickCallback): void {
    this.onTickCallback = callback;
  }

  /**
   * Check if metronome is playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Tap tempo - call this on each tap
   */
  private tapTimes: number[] = [];
  private readonly tapTimeout = 2000; // Reset after 2 seconds of no taps

  tapTempo(): number {
    const now = Date.now();

    // Reset if too long since last tap
    if (this.tapTimes.length > 0 && now - this.tapTimes[this.tapTimes.length - 1] > this.tapTimeout) {
      this.tapTimes = [];
    }

    this.tapTimes.push(now);

    // Need at least 2 taps to calculate BPM
    if (this.tapTimes.length < 2) {
      return this.bpm;
    }

    // Keep only last 8 taps
    if (this.tapTimes.length > 8) {
      this.tapTimes = this.tapTimes.slice(-8);
    }

    // Calculate average interval
    let totalInterval = 0;
    for (let i = 1; i < this.tapTimes.length; i++) {
      totalInterval += this.tapTimes[i] - this.tapTimes[i - 1];
    }
    const avgInterval = totalInterval / (this.tapTimes.length - 1);

    // Convert to BPM
    const calculatedBpm = Math.round(60000 / avgInterval);
    this.setBpm(calculatedBpm);

    return this.bpm;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private scheduler(): void {
    if (!this.audioContext || !this.isPlaying) return;

    // Schedule notes that need to play before the next interval
    while (this.nextTickTime < this.audioContext.currentTime + this.scheduleAheadTime) {
      this.scheduleNote(this.currentBeat, this.nextTickTime);
      this.advanceTick();
    }

    // Set up next scheduler call
    this.schedulerTimerId = window.setTimeout(() => this.scheduler(), this.lookahead);
  }

  private scheduleNote(beat: number, time: number): void {
    if (!this.audioContext) return;

    // Create oscillator for the click sound
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Determine if this is an accent beat
    const isAccent = beat % this.accentEvery === 0;
    oscillator.frequency.value = isAccent ? this.accentFrequency : this.tickFrequency;
    oscillator.type = 'sine';

    // Set volume with slight boost for accent
    const tickVolume = this.volume * (isAccent ? 1.0 : 0.6);
    gainNode.gain.value = tickVolume;

    // Quick attack and decay for click sound
    gainNode.gain.setValueAtTime(tickVolume, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    oscillator.start(time);
    oscillator.stop(time + 0.05);

    // Call tick callback
    if (this.onTickCallback) {
      // Schedule the callback to fire at the right time
      const delay = Math.max(0, (time - this.audioContext.currentTime) * 1000);
      setTimeout(() => {
        this.onTickCallback?.(beat, time);
      }, delay);
    }
  }

  private advanceTick(): void {
    const secondsPerBeat = 60.0 / this.bpm;
    this.nextTickTime += secondsPerBeat;
    this.currentBeat++;
  }
}

// ============================================
// SINGLETON INSTANCE FOR GLOBAL USE
// ============================================

let globalMetronome: Metronome | null = null;

export function getMetronome(options?: MetronomeOptions): Metronome {
  if (!globalMetronome) {
    globalMetronome = new Metronome(options);
  }
  return globalMetronome;
}

export function disposeMetronome(): void {
  if (globalMetronome) {
    globalMetronome.dispose();
    globalMetronome = null;
  }
}

export default Metronome;
