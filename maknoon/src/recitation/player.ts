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

/** `playing`: "s:a" (one ayah), "surah:s", or "page" (continuous from a page); `ayah`: the ayah being recited now, when timings allow */
type State = { playing: string | null; loading: boolean; reciter: Recitation | null; ayah: string | null };
let state: State = { playing: null, loading: false, reciter: null, ayah: null };
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
// continuous listening: the surah in the player and the recitation whose timings follow it
let follow: { surah: number; r: Recitation } | null = null;

/** The ayah being recited at `ms` in surah `surah` (timed recitations only). */
function ayahAt(r: Recitation, surah: number, ms: number) {
  const first = FIRST[surah];
  const n = quranIndex.surahs[surah - 1].ayat;
  let k = 0;
  for (let a = 0; a < n; a++) if (r.t![2 * (first + a)] <= ms) k = a;
  return `${surah}:${k + 1}`;
}

function ensure() {
  if (player) return player;
  setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
  player = createAudioPlayer(null, { updateInterval: 100 });
  player.addListener('playbackStatusUpdate', (st: AudioStatus) => {
    if (st.isLoaded && loaded) {
      loaded();
      loaded = null;
    }
    if (follow && st.isLoaded) {
      const k = ayahAt(follow.r, follow.surah, st.currentTime * 1000);
      if (k !== state.ayah) set({ ayah: k });
    }
    if (stopAt !== null && st.currentTime >= stopAt) {
      stopAt = null;
      player?.pause();
      set({ playing: null, ayah: null });
    } else if (st.didJustFinish) {
      // continuous listening goes on into the next surah
      if (follow && follow.surah < 114) {
        const next = follow.surah + 1;
        follow = { surah: next, r: follow.r };
        set({ ayah: `${next}:1` });
        load(follow.r.urls[next - 1]).then((p) => p.play());
      } else {
        follow = null;
        set({ playing: null, ayah: null });
      }
    }
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
  follow = null;
  player?.pause();
  set({ playing: null, loading: false, ayah: null });
}

/** Timed recitation to use: the chosen one, or the default timed one when the chosen has no ayah timings. */
const timedReciter = () => {
  const chosen = recitationById(getPrefs().reciter);
  return chosen.t ? chosen : recitationById(DEFAULT_RECITER);
};

/** Continuous listening from an ayah (the Mushaf page), following the recitation ayah by ayah. */
export async function playFrom(surah: number, ayah: number) {
  const r = timedReciter();
  const i = FIRST[surah] + ayah - 1;
  stopAt = null;
  follow = { surah, r };
  set({ playing: 'page', loading: true, reciter: r, ayah: `${surah}:${ayah}` });
  try {
    const p = await load(r.urls[surah - 1]);
    await p.seekTo(r.t![2 * i] / 1000);
    p.play();
  } finally {
    set({ loading: false });
  }
}
export const togglePage = (surah: number, ayah: number) => (state.playing === 'page' ? stop() : playFrom(surah, ayah).catch(() => stop()));

/** Plays one ayah with the chosen recitation (or the default timed one when the chosen has no ayah timings). */
export async function playAyah(surah: number, ayah: number) {
  const r = timedReciter();
  const i = FIRST[surah] + ayah - 1;
  const start = r.t![2 * i] / 1000;
  const end = r.t![2 * i + 1] / 1000;
  follow = null;
  set({ playing: `${surah}:${ayah}`, loading: true, reciter: r, ayah: null });
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
  follow = null;
  set({ playing: `surah:${surah}`, loading: true, reciter: r, ayah: null });
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
