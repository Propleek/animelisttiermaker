import { useSyncExternalStore } from 'react';
import type { Item } from '../types';

/**
 * Lecteur audio global : un seul <audio> partagé par toutes les cartes.
 * Store externe à React pour que seules les cartes concernées se redessinent.
 */

const VOLUME_KEY = 'anime-tierlist:volume';

export type SongStatus = 'idle' | 'playing' | 'paused' | 'error';

interface PlayerState {
  current: Item | null;
  playing: boolean;
  errors: ReadonlySet<string>;
}

interface PlayerTime {
  currentTime: number;
  duration: number;
  volume: number;
}

type Listener = () => void;

const audio = new Audio();
audio.preload = 'none';
audio.volume = loadVolume();

let state: PlayerState = { current: null, playing: false, errors: new Set() };
let time: PlayerTime = { currentTime: 0, duration: 0, volume: audio.volume };
const stateListeners = new Set<Listener>();
const timeListeners = new Set<Listener>();

function loadVolume(): number {
  try {
    const value = Number(localStorage.getItem(VOLUME_KEY));
    return value >= 0 && value <= 1 && localStorage.getItem(VOLUME_KEY) !== null ? value : 0.7;
  } catch {
    return 0.7;
  }
}

function setState(changes: Partial<PlayerState>) {
  state = { ...state, ...changes };
  stateListeners.forEach((l) => l());
}

function updateTime() {
  time = { currentTime: audio.currentTime, duration: Number.isFinite(audio.duration) ? audio.duration : 0, volume: audio.volume };
  timeListeners.forEach((l) => l());
}

audio.addEventListener('play', () => setState({ playing: true }));
audio.addEventListener('pause', () => setState({ playing: false }));
audio.addEventListener('ended', () => setState({ playing: false }));
audio.addEventListener('error', () => {
  if (!state.current || !audio.getAttribute('src')) return;
  setState({ playing: false, errors: new Set([...state.errors, state.current.id]) });
});
for (const event of ['timeupdate', 'durationchange', 'volumechange', 'emptied']) {
  audio.addEventListener(event, updateTime);
}

export const player = {
  /** Lance la chanson, ou la met en pause / reprend si c'est déjà celle en cours. */
  toggle(item: Item) {
    if (!item.audioUrl) return;
    if (state.current?.id === item.id && !state.errors.has(item.id)) {
      if (audio.paused) void audio.play().catch(() => {});
      else audio.pause();
      return;
    }
    const errors = new Set(state.errors);
    errors.delete(item.id);
    audio.src = item.audioUrl;
    setState({ current: item, playing: false, errors });
    void audio.play().catch(() => {});
  },
  togglePause() {
    if (!state.current) return;
    if (audio.paused) void audio.play().catch(() => {});
    else audio.pause();
  },
  stop() {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    setState({ current: null, playing: false });
  },
  seek(seconds: number) {
    audio.currentTime = seconds;
  },
  setVolume(volume: number) {
    audio.volume = volume;
    try {
      localStorage.setItem(VOLUME_KEY, String(volume));
    } catch {
      // Préférence facultative.
    }
  },
};

function subscribeState(listener: Listener) {
  stateListeners.add(listener);
  return () => stateListeners.delete(listener);
}

function subscribeTime(listener: Listener) {
  timeListeners.add(listener);
  return () => timeListeners.delete(listener);
}

/** État de lecture d'une carte (ne redessine que si cet état change). */
export function useSongStatus(id: string): SongStatus {
  return useSyncExternalStore(subscribeState, () => {
    if (state.errors.has(id)) return 'error';
    if (state.current?.id !== id) return 'idle';
    return state.playing ? 'playing' : 'paused';
  });
}

export function usePlayerState(): PlayerState {
  return useSyncExternalStore(subscribeState, () => state);
}

export function usePlayerTime(): PlayerTime {
  return useSyncExternalStore(subscribeTime, () => time);
}
