'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Episode } from '@/lib/types';
import { audioStreamUrl } from '@/lib/audio';
import { writeLastPlayed } from '@/hooks/useLastPlayed';
import { getPlayedEpisodeIds, markEpisodePlayed } from '@/lib/localProgress';
import { logPlaybackEvent } from '@/lib/analytics';
import { resolveNextEpisode } from '@/lib/data';

export type PlayerMode = 'off' | 'repeat-one' | 'autoplay-all';
export const PLAYBACK_RATES = [1, 1.25, 1.5, 2] as const;

interface PlayerState {
  episode: Episode | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  mode: PlayerMode;
}

interface PlayerContextValue extends PlayerState {
  playEpisode: (episode: Episode) => void;
  toggle: () => void;
  seek: (seconds: number) => void;
  skip: (deltaSeconds: number) => void;
  setPlaybackRate: (rate: number) => void;
  setMode: (mode: PlayerMode) => void;
  isCurrentEpisode: (episodeId: string) => boolean;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

// Checkpoints fire once per episode play-through (spec §5.2) — cleared
// whenever a new episode starts.
const CHECKPOINTS = [0.25, 0.5, 0.75] as const;

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const firedCheckpoints = useRef<Set<number>>(new Set());
  const lastPersistedAt = useRef(0);

  const [state, setState] = useState<PlayerState>({
    episode: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    playbackRate: 1,
    mode: 'autoplay-all',
  });

  // Refs mirroring the latest state/callback, read inside the
  // event-listener effect below (which only runs once, so its closures
  // would otherwise see stale values). Declared here, above first use.
  const stateRef = useRef(state);
  stateRef.current = state;

  // Lazily create the single <audio> element on first use. It is never
  // unmounted, which is what makes playback survive route changes —
  // this provider lives above the router in app/layout.tsx.
  const getAudio = useCallback(() => {
    if (!audioRef.current && typeof window !== 'undefined') {
      audioRef.current = new Audio();
    }
    return audioRef.current!;
  }, []);

  const playEpisode = useCallback(
    (episode: Episode) => {
      const audio = getAudio();
      const isSameEpisode = state.episode?.id === episode.id;

      firedCheckpoints.current = new Set();

      if (!isSameEpisode) {
        audio.src = audioStreamUrl(episode.slug);
        audio.playbackRate = state.playbackRate;
        logPlaybackEvent(episode.id, 'play_start', 0);
      }

      audio.play().catch(() => {
        // Autoplay was blocked (e.g. arriving via ?autoplay=1 without a
        // fresh enough user gesture) — state.isPlaying simply won't flip
        // to true, and the mini-player/PlayDial will still show a Play
        // affordance for the visitor to tap once, manually.
      });

      setState((prev) => ({ ...prev, episode, isPlaying: true }));
    },
    [getAudio, state.episode, state.playbackRate]
  );

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !state.episode) return;
    if (state.isPlaying) {
      audio.pause();
      setState((prev) => ({ ...prev, isPlaying: false }));
    } else {
      audio.play().catch(() => {});
      setState((prev) => ({ ...prev, isPlaying: true }));
    }
  }, [state.episode, state.isPlaying]);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = seconds;
    setState((prev) => ({ ...prev, currentTime: seconds }));
  }, []);

  const skip = useCallback(
    (deltaSeconds: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      seek(Math.max(0, Math.min(audio.duration || Infinity, audio.currentTime + deltaSeconds)));
    },
    [seek]
  );

  const setPlaybackRate = useCallback((rate: number) => {
    const audio = audioRef.current;
    if (audio) audio.playbackRate = rate;
    setState((prev) => ({ ...prev, playbackRate: rate }));
  }, []);

  const setMode = useCallback((mode: PlayerMode) => {
    setState((prev) => ({ ...prev, mode }));
  }, []);

  const isCurrentEpisode = useCallback(
    (episodeId: string) => state.episode?.id === episodeId,
    [state.episode]
  );

  const playEpisodeRef = useRef(playEpisode);
  playEpisodeRef.current = playEpisode;

  // Wire up <audio> element events once.
  useEffect(() => {
    const audio = getAudio();

    function persistProgress(currentTime: number, duration: number) {
      const episode = stateRef.current.episode;
      if (!episode || !duration) return;

      // Throttle localStorage writes to ~once every 3s of playback,
      // rather than on every timeupdate tick (which fires ~4x/sec).
      const now = Date.now();
      if (now - lastPersistedAt.current < 3000) return;
      lastPersistedAt.current = now;

      writeLastPlayed({
        episodeId: episode.id,
        slug: episode.slug,
        title: episode.title,
        episodeNumber: episode.episodeNumber,
        positionSeconds: currentTime,
        durationSeconds: duration,
        updatedAt: new Date().toISOString(),
      });
    }

    function handleTimeUpdate() {
      const { currentTime, duration } = audio;
      setState((prev) => ({ ...prev, currentTime, duration: duration || prev.duration }));
      persistProgress(currentTime, duration);

      if (!duration) return;
      const fraction = currentTime / duration;
      for (const checkpoint of CHECKPOINTS) {
        if (fraction >= checkpoint && !firedCheckpoints.current.has(checkpoint)) {
          firedCheckpoints.current.add(checkpoint);
          const episode = stateRef.current.episode;
          if (episode) {
            const eventType =
              checkpoint === 0.25 ? 'progress_25' : checkpoint === 0.5 ? 'progress_50' : 'progress_75';
            logPlaybackEvent(episode.id, eventType, currentTime);
          }
        }
      }
    }

    async function handleEnded() {
      const episode = stateRef.current.episode;
      const mode = stateRef.current.mode;
      if (!episode) return;

      logPlaybackEvent(episode.id, 'completed', audio.duration || episode.durationSeconds);
      markEpisodePlayed(episode.id);

      if (mode === 'off') {
        setState((prev) => ({ ...prev, isPlaying: false }));
        return;
      }

      if (mode === 'repeat-one') {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        firedCheckpoints.current = new Set();
        return;
      }

      // mode === 'autoplay-all' — resolve and play the next episode
      // (spec §4's three-tier fallback).
      const next = await resolveNextEpisode(episode, getPlayedEpisodeIds());
      if (next) {
        playEpisodeRef.current(next);
      } else {
        setState((prev) => ({ ...prev, isPlaying: false }));
      }
    }

    function handleLoadedMetadata() {
      setState((prev) => ({ ...prev, duration: audio.duration || 0 }));
    }

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getAudio]);

  return (
    <PlayerContext.Provider
      value={{
        ...state,
        playEpisode,
        toggle,
        seek,
        skip,
        setPlaybackRate,
        setMode,
        isCurrentEpisode,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within a PlayerProvider');
  return ctx;
}
