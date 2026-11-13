/**
 * Listening to the Quran: recitations from RATQ (assets/content/recitations.json, built and
 * verified by pipeline/importers/ratq/recitations.mjs). Audio streams from RATQ's storage, one file
 * per surah; nothing is uploaded. A single ayah plays only with a recitation whose ayah timings are
 * complete and verified; otherwise the app falls back to the default timed recitation, and never
 * guesses where an ayah starts.
 */
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from 'expo-audio';
import { useSyncExternalStore } from 'react';
import { quranIndex } from '@/content/worship';
import { getPrefs } from '@/store/prefs';

export type Recitation = {
  id: number;
  ratq: string;
  name: string;
  reciter: string | null;
  publisher: string | null;
  license: string;
  bytes: number;
  urls: string[];
  /** [start_ms, end_ms] per ayah in mushaf order, or null: whole surahs only */
  t: number[] | null;
};

const data = require('../../assets/content/recitations.json') as { recitations: Recitation[] };
export const recitations = data.recitations;
export const DEFAULT_RECITER = 35;
export const recitationById = (id: number) => recitations.find((r) => r.id === id) ?? recitations.find((r) => r.id === DEFAULT_RECITER)!;

// (surah, ayah) → index in the timing array
const FIRST: number[] = [];
{
  let n = 0;
  for (const s of quranIndex.surahs) {
    FIRST[s.n] = n;
    n += s.ayat;
  }
}

type State = { playing: string | null; loading: boolean; reciter: Recitation | null };
let state: State = { playing: null, loading: false, reciter: null };
const subs = new Set<() => void>();
const set = (s: Partial<State>) => {
  state = { ...state, ...s };
  subs.forEach((f) => f());
};
export const usePlayer = () =>
  useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => state,
  );

let player: AudioPlayer | null = null;
let stopAt: number | null = null;
let loaded: (() => void) | null = null;

function ensure() {
  if (player) return player;
  setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
  player = createAudioPlayer(null, { updateInterval: 100 });
  player.addListener('playbackStatusUpdate', (st: AudioStatus) => {
    if (st.isLoaded && loaded) {
      loaded();
      loaded = null;
    }
    if (stopAt !== null && st.currentTime >= stopAt) {
      stopAt = null;
      player?.pause();
      set({ playing: null });
    } else if (st.didJustFinish) set({ playing: null });
  });
  return player;
}

async function load(url: string) {
  const p = ensure();
  const ready = new Promise<void>((res) => {
    loaded = res;
    setTimeout(res, 12000);
  });
  p.replace({ uri: url });
  await ready;
  return p;
}

export function stop() {
  stopAt = null;
  player?.pause();
  set({ playing: null, loading: false });
}

/** Plays one ayah with the chosen recitation (or the default timed one when the chosen has no ayah timings). */
export async function playAyah(surah: number, ayah: number) {
  const chosen = recitationById(getPrefs().reciter);
  const r = chosen.t ? chosen : recitationById(DEFAULT_RECITER);
  const i = FIRST[surah] + ayah - 1;
  const start = r.t![2 * i] / 1000;
  const end = r.t![2 * i + 1] / 1000;
  set({ playing: `${surah}:${ayah}`, loading: true, reciter: r });
  try {
    const p = await load(r.urls[surah - 1]);
    await p.seekTo(start);
    stopAt = end;
    p.play();
  } finally {
    set({ loading: false });
  }
}

/** Plays a whole surah with the chosen recitation (works for every recitation). */
export async function playSurah(surah: number) {
  const r = recitationById(getPrefs().reciter);
  set({ playing: `surah:${surah}`, loading: true, reciter: r });
  try {
    const p = await load(r.urls[surah - 1]);
    stopAt = null;
    await p.seekTo(0);
    p.play();
  } finally {
    set({ loading: false });
  }
}

export const toggleAyah = (surah: number, ayah: number) => (state.playing === `${surah}:${ayah}` ? stop() : playAyah(surah, ayah).catch(() => set({ playing: null, loading: false })));
export const toggleSurah = (surah: number) => (state.playing === `surah:${surah}` ? stop() : playSurah(surah).catch(() => set({ playing: null, loading: false })));

/** «تلاوة: … · الناشر · CC BY-NC-ND عبر رتق» */
export const recitationCredit = (r: Recitation) => `تلاوة: ${r.name}${r.publisher ? ` · ${r.publisher}` : ''} · ${r.license.replace(/-/g, ' ').replace('CC BY NC ND', 'CC BY-NC-ND')} عبر رتق`;
