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

// Every player surface (PlayDial, EpisodePlayer, MiniPlayer) renders off
// this instead of a single isPlaying boolean, so a tap can be
// acknowledged ('loading') before the browser confirms audio is
// actually coming out of the speaker ('playing'), and a mid-playback
// stall ('buffering') or real failure ('error') is distinguishable from
// a plain pause.
export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'buffering' | 'error';

interface PlayerState {
  episode: Episode | null;
  status: PlaybackStatus;
  isPlaying: boolean; // convenience flag: true for 'playing' and 'buffering'
  currentTime: number;
  duration: number;
  bufferedSeconds: number; // furthest point currently buffered — for a buffered-vs-played progress bar
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
  retry: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

// Checkpoints fire once per episode play-through (spec §5.2) — cleared
// whenever a new episode starts.
const CHECKPOINTS = [0.25, 0.5, 0.75] as const;

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const firedCheckpoints = useRef<Set<number>>(new Set());
  const hasFiredPlaybackStarted = useRef(false);
  const lastPersistedAt = useRef(0);
  // Guards against overlapping play()/pause() calls from rapid repeated
  // taps — HTMLMediaElement.play() is async, and calling pause() while a
  // play() promise is still in flight throws in some browsers (notably
  // Safari: "The play() request was interrupted").
  const playRequestPending = useRef(false);

  const [state, setState] = useState<PlayerState>({
    episode: null,
    status: 'idle',
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    bufferedSeconds: 0,
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
      // 'metadata' (not 'auto'): lets duration/seekability resolve
      // quickly without pulling the full file over a potentially
      // expensive mobile data connection before the user has even
      // tapped Play.
      audioRef.current.preload = 'metadata';
    }
    return audioRef.current!;
  }, []);

  function requestPlay(audio: HTMLAudioElement) {
    playRequestPending.current = true;
    audio
      .play()
      .catch(() => {
        // Rejected play() — most commonly a blocked autoplay attempt
        // (e.g. ?autoplay=1 without a fresh-enough user gesture). Real
        // media errors are handled separately by the 'error' listener.
        // Fall back to a tappable idle state rather than leaving the
        // button stuck showing "loading" forever.
        setState((prev) => (prev.status === 'loading' ? { ...prev, status: 'idle' } : prev));
      })
      .finally(() => {
        playRequestPending.current = false;
      });
  }

  const playEpisode = useCallback(
    (episode: Episode) => {
      const audio = getAudio();
      const isSameEpisode = state.episode?.id === episode.id;

      firedCheckpoints.current = new Set();

      if (!isSameEpisode) {
        hasFiredPlaybackStarted.current = false;
        audio.src = audioStreamUrl(episode.slug);
        audio.playbackRate = state.playbackRate;
        logPlaybackEvent(episode.id, 'play_start', 0);
      }

      setState((prev) => ({ ...prev, episode, status: 'loading' }));
      requestPlay(audio);
    },
    [getAudio, state.episode, state.playbackRate]
  );

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !state.episode || playRequestPending.current) return;

    if (!audio.paused) {
      audio.pause(); // the 'pause' listener below is the single source of truth for the resulting state
      return;
    }

    setState((prev) => ({ ...prev, status: 'loading' }));
    requestPlay(audio);
  }, [state.episode]);

  const retry = useCallback(() => {
    if (state.episode) playEpisode(state.episode);
  }, [state.episode, playEpisode]);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const knownDuration = Number.isFinite(audio.duration) ? audio.duration : Infinity;
    const clamped = Math.max(0, Math.min(knownDuration, Number.isFinite(seconds) ? seconds : 0));
    // Seeking into a not-yet-buffered position is valid (the browser
    // issues a new Range request for it) but will visibly buffer —
    // that's surfaced naturally by the 'waiting' listener below rather
    // than needing special-case handling here.
    audio.currentTime = clamped;
    setState((prev) => ({ ...prev, currentTime: clamped }));
  }, []);

  const skip = useCallback(
    (deltaSeconds: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      const duration = Number.isFinite(audio.duration) ? audio.duration : Infinity;
      seek(Math.max(0, Math.min(duration, audio.currentTime + deltaSeconds)));
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

    function handleProgress() {
      const { buffered } = audio;
      const bufferedEnd = buffered.length > 0 ? buffered.end(buffered.length - 1) : 0;
      setState((prev) => (prev.bufferedSeconds === bufferedEnd ? prev : { ...prev, bufferedSeconds: bufferedEnd }));
    }

    // Fires once actual audio output has begun — the real "audio
    // successfully starts" signal, as opposed to 'play_start' (the tap).
    function handlePlaying() {
      setState((prev) => ({ ...prev, status: 'playing', isPlaying: true }));
      const episode = stateRef.current.episode;
      if (episode && !hasFiredPlaybackStarted.current) {
        hasFiredPlaybackStarted.current = true;
        logPlaybackEvent(episode.id, 'playback_started', audio.currentTime);
      }
    }

    // Mid-playback stall (slow network / temporary buffering). 'stalled'
    // is a broader fallback some browsers fire when 'waiting' doesn't.
    function handleBuffering() {
      setState((prev) =>
        prev.status === 'playing' || prev.status === 'loading' ? { ...prev, status: 'buffering' } : prev
      );
    }

    function handlePause() {
      // The element also fires 'pause' immediately before 'ended' —
      // handleEnded owns the resulting status in that case.
      if (audio.ended) return;
      setState((prev) => ({ ...prev, status: 'paused', isPlaying: false }));
    }

    function handleAudioError() {
      const episode = stateRef.current.episode;
      setState((prev) => ({ ...prev, status: 'error', isPlaying: false }));
      if (episode) {
        logPlaybackEvent(episode.id, 'playback_error', audio.currentTime || 0);
      }
    }

    async function handleEnded() {
      const episode = stateRef.current.episode;
      const mode = stateRef.current.mode;
      if (!episode) return;

      logPlaybackEvent(episode.id, 'completed', audio.duration || episode.durationSeconds);
      markEpisodePlayed(episode.id);

      if (mode === 'off') {
        setState((prev) => ({ ...prev, status: 'paused', isPlaying: false }));
        return;
      }

      if (mode === 'repeat-one') {
        audio.currentTime = 0;
        firedCheckpoints.current = new Set();
        hasFiredPlaybackStarted.current = false;
        setState((prev) => ({ ...prev, status: 'loading' }));
        requestPlay(audio);
        return;
      }

      // mode === 'autoplay-all' — resolve and play the next episode
      // (spec §4's three-tier fallback).
      const next = await resolveNextEpisode(episode, getPlayedEpisodeIds());
      if (next) {
        playEpisodeRef.current(next);
      } else {
        setState((prev) => ({ ...prev, status: 'paused', isPlaying: false }));
      }
    }

    function handleLoadedMetadata() {
      setState((prev) => ({ ...prev, duration: audio.duration || 0 }));
    }

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('progress', handleProgress);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('waiting', handleBuffering);
    audio.addEventListener('stalled', handleBuffering);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleAudioError);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('progress', handleProgress);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('waiting', handleBuffering);
      audio.removeEventListener('stalled', handleBuffering);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleAudioError);
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
        retry,
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
