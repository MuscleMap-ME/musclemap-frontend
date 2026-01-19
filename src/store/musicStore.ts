/**
 * Music Store (Zustand)
 *
 * Manages music streaming integration:
 * - Provider connections (Spotify, Apple Music, YouTube Music)
 * - Playback controls
 * - Playlist management
 * - BPM matching for workouts
 *
 * @example
 * const { isPlaying, toggle, currentTrack } = useMusicPlayback();
 */

import { create } from 'zustand';
import { subscribeWithSelector, persist } from 'zustand/middleware';

// ============================================
// TYPES
// ============================================

export type MusicProvider = 'spotify' | 'apple_music' | 'youtube_music';

export interface MusicConnection {
  provider: MusicProvider;
  connected: boolean;
  username?: string;
  avatarUrl?: string;
  connectedAt?: Date;
  expiresAt?: Date;
}

export interface Track {
  id: string;
  name: string;
  artist: string;
  album?: string;
  albumArt?: string;
  durationMs: number;
  bpm?: number;
  provider: MusicProvider;
  uri: string;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  trackCount: number;
  provider: MusicProvider;
  uri: string;
}

interface MusicState {
  // Connection state
  connections: MusicConnection[];
  activeProvider: MusicProvider | null;
  isConnecting: boolean;
  connectionError: string | null;

  // Playback state
  isPlaying: boolean;
  currentTrack: Track | null;
  queue: Track[];
  progress: number; // 0-100
  progressMs: number;
  volume: number; // 0-100
  isMuted: boolean;
  shuffle: boolean;
  repeat: 'off' | 'track' | 'context';

  // Playlists
  playlists: Playlist[];
  selectedPlaylistId: string | null;
  isLoadingPlaylists: boolean;

  // Workout integration
  autoPlayOnWorkout: boolean;
  bpmMatchingEnabled: boolean;
  targetBpm: number | null;
  fadeOnRest: boolean;

  // UI state
  isExpanded: boolean;
  showMiniPlayer: boolean;

  // Actions - Connection
  connect: (provider: MusicProvider) => Promise<void>;
  disconnect: (provider: MusicProvider) => Promise<void>;
  setActiveProvider: (provider: MusicProvider | null) => void;
  refreshConnections: () => Promise<void>;

  // Actions - Playback
  play: () => void;
  pause: () => void;
  toggle: () => void;
  next: () => void;
  previous: () => void;
  seek: (positionMs: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;

  // Actions - Queue & Playlists
  playTrack: (track: Track) => void;
  addToQueue: (track: Track) => void;
  clearQueue: () => void;
  loadPlaylists: () => Promise<void>;
  selectPlaylist: (playlistId: string) => void;
  playPlaylist: (playlistId: string, shuffle?: boolean) => void;

  // Actions - Workout integration
  setAutoPlayOnWorkout: (enabled: boolean) => void;
  setBpmMatching: (enabled: boolean, targetBpm?: number) => void;
  setFadeOnRest: (enabled: boolean) => void;
  startWorkoutPlayback: () => void;
  pauseForRest: () => void;
  resumeAfterRest: () => void;

  // Actions - UI
  toggleExpanded: () => void;
  setShowMiniPlayer: (show: boolean) => void;

  // Internal
  updatePlaybackState: (state: Partial<MusicState>) => void;
}

// ============================================
// HELPERS
// ============================================

const getToken = () => localStorage.getItem('musclemap_token');

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url, { ...options, headers });
}

// Spotify Web Playback SDK state sync
let spotifyPlayer: Spotify.Player | null = null;
let spotifyDeviceId: string | null = null;

// ============================================
// STORE
// ============================================

export const useMusicStore = create<MusicState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Initial state
        connections: [],
        activeProvider: null,
        isConnecting: false,
        connectionError: null,

        isPlaying: false,
        currentTrack: null,
        queue: [],
        progress: 0,
        progressMs: 0,
        volume: 70,
        isMuted: false,
        shuffle: false,
        repeat: 'off',

        playlists: [],
        selectedPlaylistId: null,
        isLoadingPlaylists: false,

        autoPlayOnWorkout: true,
        bpmMatchingEnabled: false,
        targetBpm: null,
        fadeOnRest: true,

        isExpanded: false,
        showMiniPlayer: true,

        // ============================================
        // CONNECTION
        // ============================================

        connect: async (provider) => {
          set({ isConnecting: true, connectionError: null });

          try {
            // Open OAuth popup
            const res = await fetchWithAuth(`/api/me/music/connect/${provider}`, {
              method: 'POST',
            });

            if (!res.ok) throw new Error('Failed to initiate connection');

            const data = await res.json();
            if (data.data?.authUrl) {
              // Open OAuth window
              const width = 500;
              const height = 600;
              const left = window.screenX + (window.outerWidth - width) / 2;
              const top = window.screenY + (window.outerHeight - height) / 2;

              const authWindow = window.open(
                data.data.authUrl,
                `${provider}_auth`,
                `width=${width},height=${height},left=${left},top=${top}`
              );

              // Poll for completion
              const pollInterval = setInterval(async () => {
                if (authWindow?.closed) {
                  clearInterval(pollInterval);
                  // Check if connection succeeded
                  await get().refreshConnections();
                  set({ isConnecting: false });
                }
              }, 500);
            }
          } catch (error) {
            set({
              isConnecting: false,
              connectionError: error instanceof Error ? error.message : 'Connection failed',
            });
          }
        },

        disconnect: async (provider) => {
          try {
            await fetchWithAuth(`/api/me/music/disconnect/${provider}`, {
              method: 'DELETE',
            });

            set((s) => ({
              connections: s.connections.filter((c) => c.provider !== provider),
              activeProvider: s.activeProvider === provider ? null : s.activeProvider,
            }));

            // Stop playback if disconnecting active provider
            if (get().activeProvider === provider) {
              get().pause();
              set({ currentTrack: null, isPlaying: false });
            }
          } catch {
            // Silent fail
          }
        },

        setActiveProvider: (provider) => {
          set({ activeProvider: provider });
          if (provider) {
            get().loadPlaylists();
          }
        },

        refreshConnections: async () => {
          try {
            const res = await fetchWithAuth('/api/me/music/status');
            if (!res.ok) return;

            const data = await res.json();
            if (data.success && data.data?.connections) {
              const connections: MusicConnection[] = data.data.connections.map(
                (c: { provider: MusicProvider; connected_at: string; token_expires_at: string }) => ({
                  provider: c.provider,
                  connected: true,
                  connectedAt: new Date(c.connected_at),
                  expiresAt: c.token_expires_at ? new Date(c.token_expires_at) : undefined,
                })
              );

              set({ connections });

              // Set active provider if none and we have connections
              if (!get().activeProvider && connections.length > 0) {
                set({ activeProvider: connections[0].provider });
              }
            }
          } catch {
            // Silent fail
          }
        },

        // ============================================
        // PLAYBACK
        // ============================================

        play: () => {
          const { activeProvider } = get();
          if (!activeProvider) return;

          if (activeProvider === 'spotify' && spotifyPlayer) {
            spotifyPlayer.resume();
          }

          set({ isPlaying: true });
        },

        pause: () => {
          const { activeProvider } = get();
          if (!activeProvider) return;

          if (activeProvider === 'spotify' && spotifyPlayer) {
            spotifyPlayer.pause();
          }

          set({ isPlaying: false });
        },

        toggle: () => {
          const { isPlaying } = get();
          if (isPlaying) {
            get().pause();
          } else {
            get().play();
          }
        },

        next: () => {
          const { activeProvider, queue } = get();
          if (!activeProvider) return;

          if (activeProvider === 'spotify' && spotifyPlayer) {
            spotifyPlayer.nextTrack();
          }

          // Update queue
          if (queue.length > 0) {
            set({ queue: queue.slice(1) });
          }
        },

        previous: () => {
          const { activeProvider, progressMs } = get();
          if (!activeProvider) return;

          // If more than 3 seconds into track, restart; otherwise go to previous
          if (progressMs > 3000) {
            get().seek(0);
            return;
          }

          if (activeProvider === 'spotify' && spotifyPlayer) {
            spotifyPlayer.previousTrack();
          }
        },

        seek: (positionMs) => {
          const { activeProvider, currentTrack } = get();
          if (!activeProvider || !currentTrack) return;

          if (activeProvider === 'spotify' && spotifyPlayer) {
            spotifyPlayer.seek(positionMs);
          }

          const progress = (positionMs / currentTrack.durationMs) * 100;
          set({ progressMs: positionMs, progress });
        },

        setVolume: (volume) => {
          const { activeProvider } = get();

          if (activeProvider === 'spotify' && spotifyPlayer) {
            spotifyPlayer.setVolume(volume / 100);
          }

          set({ volume, isMuted: volume === 0 });
        },

        toggleMute: () => {
          const { isMuted, volume } = get();

          if (isMuted) {
            get().setVolume(volume || 70);
          } else {
            get().setVolume(0);
          }

          set({ isMuted: !isMuted });
        },

        toggleShuffle: () => {
          set((s) => ({ shuffle: !s.shuffle }));
        },

        cycleRepeat: () => {
          set((s) => {
            const order: Array<'off' | 'track' | 'context'> = ['off', 'context', 'track'];
            const currentIndex = order.indexOf(s.repeat);
            return { repeat: order[(currentIndex + 1) % order.length] };
          });
        },

        // ============================================
        // QUEUE & PLAYLISTS
        // ============================================

        playTrack: (track) => {
          const { activeProvider } = get();
          if (!activeProvider) return;

          // Use Spotify Web Playback SDK or API
          if (activeProvider === 'spotify' && spotifyDeviceId) {
            fetchWithAuth('/api/me/music/playback/play', {
              method: 'POST',
              body: JSON.stringify({
                uris: [track.uri],
                device_id: spotifyDeviceId,
              }),
            });
          }

          set({ currentTrack: track, isPlaying: true, progressMs: 0, progress: 0 });
        },

        addToQueue: (track) => {
          set((s) => ({ queue: [...s.queue, track] }));
        },

        clearQueue: () => {
          set({ queue: [] });
        },

        loadPlaylists: async () => {
          const { activeProvider } = get();
          if (!activeProvider) return;

          set({ isLoadingPlaylists: true });

          try {
            const res = await fetchWithAuth('/api/me/music/playlists');
            if (!res.ok) throw new Error('Failed to load playlists');

            const data = await res.json();
            if (data.success && data.data?.playlists) {
              const playlists: Playlist[] = data.data.playlists.map(
                (p: {
                  id: string;
                  name: string;
                  description?: string;
                  images?: Array<{ url: string }>;
                  tracks?: { total: number };
                  uri: string;
                }) => ({
                  id: p.id,
                  name: p.name,
                  description: p.description,
                  imageUrl: p.images?.[0]?.url,
                  trackCount: p.tracks?.total || 0,
                  provider: activeProvider,
                  uri: p.uri,
                })
              );

              set({ playlists, isLoadingPlaylists: false });
            }
          } catch {
            set({ isLoadingPlaylists: false });
          }
        },

        selectPlaylist: (playlistId) => {
          set({ selectedPlaylistId: playlistId });
        },

        playPlaylist: (playlistId, shuffle = false) => {
          const { activeProvider, playlists } = get();
          if (!activeProvider) return;

          const playlist = playlists.find((p) => p.id === playlistId);
          if (!playlist) return;

          set({ shuffle, selectedPlaylistId: playlistId });

          if (activeProvider === 'spotify' && spotifyDeviceId) {
            fetchWithAuth('/api/me/music/playback/play', {
              method: 'POST',
              body: JSON.stringify({
                context_uri: playlist.uri,
                device_id: spotifyDeviceId,
              }),
            });
          }
        },

        // ============================================
        // WORKOUT INTEGRATION
        // ============================================

        setAutoPlayOnWorkout: (enabled) => {
          set({ autoPlayOnWorkout: enabled });
        },

        setBpmMatching: (enabled, targetBpm) => {
          set({
            bpmMatchingEnabled: enabled,
            targetBpm: targetBpm || null,
          });
        },

        setFadeOnRest: (enabled) => {
          set({ fadeOnRest: enabled });
        },

        startWorkoutPlayback: () => {
          const { autoPlayOnWorkout, selectedPlaylistId } = get();

          if (autoPlayOnWorkout && selectedPlaylistId) {
            get().playPlaylist(selectedPlaylistId);
          }
        },

        pauseForRest: () => {
          const { fadeOnRest, volume } = get();

          if (fadeOnRest) {
            // Fade out over 1 second
            const fadeSteps = 10;
            const stepVolume = volume / fadeSteps;
            let currentStep = 0;

            const fadeInterval = setInterval(() => {
              currentStep++;
              const newVolume = Math.max(0, volume - stepVolume * currentStep);
              get().setVolume(newVolume);

              if (currentStep >= fadeSteps) {
                clearInterval(fadeInterval);
                get().pause();
              }
            }, 100);
          } else {
            get().pause();
          }
        },

        resumeAfterRest: () => {
          const { fadeOnRest } = get();
          const targetVolume = 70; // Reset to default

          get().play();

          if (fadeOnRest) {
            // Fade in over 1 second
            const fadeSteps = 10;
            const stepVolume = targetVolume / fadeSteps;
            let currentStep = 0;

            get().setVolume(0);

            const fadeInterval = setInterval(() => {
              currentStep++;
              const newVolume = Math.min(targetVolume, stepVolume * currentStep);
              get().setVolume(newVolume);

              if (currentStep >= fadeSteps) {
                clearInterval(fadeInterval);
              }
            }, 100);
          }
        },

        // ============================================
        // UI
        // ============================================

        toggleExpanded: () => {
          set((s) => ({ isExpanded: !s.isExpanded }));
        },

        setShowMiniPlayer: (show) => {
          set({ showMiniPlayer: show });
        },

        // ============================================
        // INTERNAL
        // ============================================

        updatePlaybackState: (state) => {
          set(state);
        },
      }),
      {
        name: 'musclemap-music',
        partialize: (state) => ({
          activeProvider: state.activeProvider,
          volume: state.volume,
          shuffle: state.shuffle,
          repeat: state.repeat,
          autoPlayOnWorkout: state.autoPlayOnWorkout,
          bpmMatchingEnabled: state.bpmMatchingEnabled,
          targetBpm: state.targetBpm,
          fadeOnRest: state.fadeOnRest,
          showMiniPlayer: state.showMiniPlayer,
          selectedPlaylistId: state.selectedPlaylistId,
        }),
      }
    )
  )
);

// ============================================
// SPOTIFY WEB PLAYBACK SDK INTEGRATION
// ============================================

export function initializeSpotifyPlayer(accessToken: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if SDK is already loaded
    if (window.Spotify) {
      createPlayer(accessToken);
      resolve();
      return;
    }

    // Load Spotify SDK script
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;

    window.onSpotifyWebPlaybackSDKReady = () => {
      createPlayer(accessToken);
      resolve();
    };

    script.onerror = () => reject(new Error('Failed to load Spotify SDK'));
    document.body.appendChild(script);
  });
}

function createPlayer(accessToken: string) {
  const store = useMusicStore.getState();

  spotifyPlayer = new window.Spotify.Player({
    name: 'MuscleMap Web Player',
    getOAuthToken: (cb: (token: string) => void) => cb(accessToken),
    volume: store.volume / 100,
  });

  // Event handlers
  spotifyPlayer.addListener('ready', ({ device_id }: { device_id: string }) => {
    spotifyDeviceId = device_id;
    console.log('Spotify Player ready with device ID:', device_id);
  });

  spotifyPlayer.addListener('not_ready', ({ device_id }: { device_id: string }) => {
    console.log('Spotify Player not ready:', device_id);
    spotifyDeviceId = null;
  });

  spotifyPlayer.addListener('player_state_changed', (state: Spotify.PlaybackState | null) => {
    if (!state) return;

    const track = state.track_window.current_track;
    const currentTrack: Track | null = track
      ? {
          id: track.id || '',
          name: track.name,
          artist: track.artists.map((a) => a.name).join(', '),
          album: track.album.name,
          albumArt: track.album.images[0]?.url,
          durationMs: track.duration_ms,
          provider: 'spotify',
          uri: track.uri,
        }
      : null;

    useMusicStore.getState().updatePlaybackState({
      isPlaying: !state.paused,
      currentTrack,
      progressMs: state.position,
      progress: currentTrack ? (state.position / currentTrack.durationMs) * 100 : 0,
      shuffle: state.shuffle,
      repeat: state.repeat_mode === 0 ? 'off' : state.repeat_mode === 1 ? 'context' : 'track',
    });
  });

  spotifyPlayer.connect();
}

export function disconnectSpotifyPlayer() {
  if (spotifyPlayer) {
    spotifyPlayer.disconnect();
    spotifyPlayer = null;
    spotifyDeviceId = null;
  }
}

// ============================================
// SHORTHAND HOOKS
// ============================================

/**
 * Hook for music playback controls
 */
export const useMusicPlayback = () => {
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const currentTrack = useMusicStore((s) => s.currentTrack);
  const progress = useMusicStore((s) => s.progress);
  const progressMs = useMusicStore((s) => s.progressMs);
  const volume = useMusicStore((s) => s.volume);
  const isMuted = useMusicStore((s) => s.isMuted);
  const shuffle = useMusicStore((s) => s.shuffle);
  const repeat = useMusicStore((s) => s.repeat);

  const play = useMusicStore((s) => s.play);
  const pause = useMusicStore((s) => s.pause);
  const toggle = useMusicStore((s) => s.toggle);
  const next = useMusicStore((s) => s.next);
  const previous = useMusicStore((s) => s.previous);
  const seek = useMusicStore((s) => s.seek);
  const setVolume = useMusicStore((s) => s.setVolume);
  const toggleMute = useMusicStore((s) => s.toggleMute);
  const toggleShuffle = useMusicStore((s) => s.toggleShuffle);
  const cycleRepeat = useMusicStore((s) => s.cycleRepeat);

  return {
    isPlaying,
    currentTrack,
    progress,
    progressMs,
    volume,
    isMuted,
    shuffle,
    repeat,
    play,
    pause,
    toggle,
    next,
    previous,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
  };
};

/**
 * Hook for music connections
 */
export const useMusicConnections = () => {
  const connections = useMusicStore((s) => s.connections);
  const activeProvider = useMusicStore((s) => s.activeProvider);
  const isConnecting = useMusicStore((s) => s.isConnecting);
  const connectionError = useMusicStore((s) => s.connectionError);

  const connect = useMusicStore((s) => s.connect);
  const disconnect = useMusicStore((s) => s.disconnect);
  const setActiveProvider = useMusicStore((s) => s.setActiveProvider);
  const refreshConnections = useMusicStore((s) => s.refreshConnections);

  const isConnected = (provider: MusicProvider) =>
    connections.some((c) => c.provider === provider && c.connected);

  return {
    connections,
    activeProvider,
    isConnecting,
    connectionError,
    isConnected,
    connect,
    disconnect,
    setActiveProvider,
    refresh: refreshConnections,
  };
};

/**
 * Hook for playlist management
 */
export const useMusicPlaylists = () => {
  const playlists = useMusicStore((s) => s.playlists);
  const selectedPlaylistId = useMusicStore((s) => s.selectedPlaylistId);
  const isLoadingPlaylists = useMusicStore((s) => s.isLoadingPlaylists);

  const loadPlaylists = useMusicStore((s) => s.loadPlaylists);
  const selectPlaylist = useMusicStore((s) => s.selectPlaylist);
  const playPlaylist = useMusicStore((s) => s.playPlaylist);

  const selectedPlaylist = playlists.find((p) => p.id === selectedPlaylistId);

  return {
    playlists,
    selectedPlaylist,
    selectedPlaylistId,
    isLoading: isLoadingPlaylists,
    load: loadPlaylists,
    select: selectPlaylist,
    play: playPlaylist,
  };
};

/**
 * Hook for workout music integration
 */
export const useMusicWorkoutIntegration = () => {
  const autoPlayOnWorkout = useMusicStore((s) => s.autoPlayOnWorkout);
  const bpmMatchingEnabled = useMusicStore((s) => s.bpmMatchingEnabled);
  const targetBpm = useMusicStore((s) => s.targetBpm);
  const fadeOnRest = useMusicStore((s) => s.fadeOnRest);

  const setAutoPlayOnWorkout = useMusicStore((s) => s.setAutoPlayOnWorkout);
  const setBpmMatching = useMusicStore((s) => s.setBpmMatching);
  const setFadeOnRest = useMusicStore((s) => s.setFadeOnRest);
  const startWorkoutPlayback = useMusicStore((s) => s.startWorkoutPlayback);
  const pauseForRest = useMusicStore((s) => s.pauseForRest);
  const resumeAfterRest = useMusicStore((s) => s.resumeAfterRest);

  return {
    autoPlayOnWorkout,
    bpmMatchingEnabled,
    targetBpm,
    fadeOnRest,
    setAutoPlayOnWorkout,
    setBpmMatching,
    setFadeOnRest,
    startWorkout: startWorkoutPlayback,
    pauseForRest,
    resumeAfterRest,
  };
};

/**
 * Hook for mini player UI state
 */
export const useMusicUI = () => {
  const isExpanded = useMusicStore((s) => s.isExpanded);
  const showMiniPlayer = useMusicStore((s) => s.showMiniPlayer);

  const toggleExpanded = useMusicStore((s) => s.toggleExpanded);
  const setShowMiniPlayer = useMusicStore((s) => s.setShowMiniPlayer);

  return {
    isExpanded,
    showMiniPlayer,
    toggleExpanded,
    setShowMiniPlayer,
  };
};

// ============================================
// TYPE DECLARATIONS FOR SPOTIFY SDK
// ============================================

declare global {
  interface Window {
    Spotify: typeof Spotify;
    onSpotifyWebPlaybackSDKReady: () => void;
  }

  namespace Spotify {
    interface Player {
      connect(): Promise<boolean>;
      disconnect(): void;
      addListener(event: string, callback: (state: PlaybackState | { device_id: string } | null) => void): void;
      removeListener(event: string): void;
      getCurrentState(): Promise<PlaybackState | null>;
      setVolume(volume: number): Promise<void>;
      pause(): Promise<void>;
      resume(): Promise<void>;
      togglePlay(): Promise<void>;
      seek(positionMs: number): Promise<void>;
      previousTrack(): Promise<void>;
      nextTrack(): Promise<void>;
    }

    interface PlaybackState {
      paused: boolean;
      position: number;
      duration: number;
      shuffle: boolean;
      repeat_mode: number;
      track_window: {
        current_track: Track;
        previous_tracks: Track[];
        next_tracks: Track[];
      };
    }

    interface Track {
      id: string | null;
      uri: string;
      name: string;
      duration_ms: number;
      artists: Array<{ name: string; uri: string }>;
      album: {
        name: string;
        uri: string;
        images: Array<{ url: string }>;
      };
    }

    const Player: {
      new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }): Player;
    };
  }
}

export default useMusicStore;
