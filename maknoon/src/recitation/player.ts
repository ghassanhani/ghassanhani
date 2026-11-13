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
import { getPrefs, subscribe as onPrefs } from '@/store/prefs';
import { ayahClip } from './ayahClip';

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
type State = { playing: string | null; loading: boolean; reciter: Recitation | null; ayah: string | null; paused: boolean; rate: number };
let state: State = { playing: null, loading: false, reciter: null, ayah: null, paused: false, rate: 1 };
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

// Position in the file, kept apart from `state` so only the screens that show it redraw (10×/s).
type Progress = { time: number; duration: number };
let progress: Progress = { time: 0, duration: 0 };
const psubs = new Set<() => void>();
const setProgress = (p: Progress) => {
  if (Math.abs(p.time - progress.time) < 0.2 && p.duration === progress.duration) return;
  progress = p;
  psubs.forEach((f) => f());
};
export const useProgress = () =>
  useSyncExternalStore(
    (f) => {
      psubs.add(f);
      return () => psubs.delete(f);
    },
    () => progress,
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
  // keeps playing with the screen locked or the app in the background (UIBackgroundModes: audio)
  setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' }).catch(() => undefined);
  player = createAudioPlayer(null, { updateInterval: 100 });
  player.addListener('playbackStatusUpdate', (st: AudioStatus) => {
    if (st.isLoaded && loaded) {
      loaded();
      loaded = null;
    }
    if (st.isLoaded) setProgress({ time: st.currentTime, duration: st.duration || 0 });
    if (follow?.r.t && st.isLoaded) {
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
        set({ ayah: follow.r.t ? `${next}:1` : null });
        load(follow.r.urls[next - 1]).then((p) => p.play());
      } else if (state.playing?.startsWith('surah:') && Number(state.playing.slice(6)) < 114) {
        // the listening hub goes on to the next surah
        playSurah(Number(state.playing.slice(6)) + 1).catch(() => stop());
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
  // ready as soon as the player says so: from its status event, or seen directly (a quick look
  // every 40 ms), never a fixed wait; 10 s at most for a slow network
  const ready = new Promise<void>((res) => {
    loaded = res;
    const t0 = Date.now();
    const look = setInterval(() => {
      if (p.isLoaded || Date.now() - t0 > 10000) {
        clearInterval(look);
        res();
      }
    }, 40);
  });
  p.replace({ uri: url });
  await ready;
  loaded = null;
  return p;
}

export function stop() {
  stopAt = null;
  follow = null;
  player?.pause();
  try {
    player?.clearLockScreenControls();
  } catch {
    // not shown
  }
  set({ playing: null, loading: false, ayah: null, paused: false });
}

/** Pause or carry on, keeping the place. */
export function pauseResume() {
  if (!player || !state.playing) return;
  if (state.paused) player.play();
  else player.pause();
  set({ paused: !state.paused });
}

/** Jump to a second in the current file. */
export function seek(sec: number) {
  player?.seekTo(Math.max(0, sec)).catch(() => undefined);
}

/** Playback speed (0.75 – 1.5). */
export function setRate(rate: number) {
  player?.setPlaybackRate(rate);
  set({ rate });
}

/** The surah before or after the one playing in the listening hub. */
export function skipSurah(delta: number) {
  const n = state.playing?.startsWith('surah:') ? Number(state.playing.slice(6)) : null;
  if (n === null) return;
  const next = Math.min(114, Math.max(1, n + delta));
  if (next !== n) playSurah(next).catch(() => stop());
}

/** «سورة …» and the reciter on the lock screen and in Control Centre. */
function showOnLockScreen(p: AudioPlayer, surah: number, r: Recitation) {
  try {
    p.setActiveForLockScreen(true, { title: `سورة ${plainName(surah)}`, artist: r.name, albumTitle: 'المكنون' });
  } catch {
    // lock screen controls are optional
  }
}
const plainName = (n: number) => (quranIndex.surahs[n - 1]?.name ?? '').replace(/[\u064B-\u0652\u0670]/g, '');

/** Timed recitation to use: the chosen one, or the default timed one when the chosen has no ayah timings. */
const timedReciter = () => {
  const chosen = recitationById(getPrefs().reciter);
  return chosen.t ? chosen : recitationById(DEFAULT_RECITER);
};

/**
 * Continuous listening from an ayah (the Mushaf page) with the chosen recitation. A timed one starts
 * at that ayah and is followed ayah by ayah; one without ayah timings starts at the beginning of the
 * surah (where an ayah starts in it is never guessed).
 */
export async function playFrom(surah: number, ayah: number) {
  const r = recitationById(getPrefs().reciter);
  stopAt = null;
  follow = { surah, r };
  set({ playing: 'page', loading: true, reciter: r, ayah: r.t ? `${surah}:${ayah}` : null });
  try {
    const p = await load(r.urls[surah - 1]);
    await p.seekTo(r.t ? r.t[2 * (FIRST[surah] + ayah - 1)] / 1000 : 0);
    p.setPlaybackRate(state.rate);
    p.play();
    set({ paused: false });
    showOnLockScreen(p, surah, r);
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
  set({ playing: `${surah}:${ayah}`, loading: true, reciter: r, ayah: null, paused: false });
  try {
    // just this ayah's bytes, fetched ahead or now (see ayahClip); else stream the surah and seek
    const clip = await ayahClip(r.urls[surah - 1], `${r.id}-${surah}-${ayah}`, start * 1000, end * 1000);
    if (state.playing !== `${surah}:${ayah}`) return; // stopped while it was fetched
    if (clip) {
      const p = await load(clip);
      stopAt = null;
      await p.seekTo(0);
      p.play();
      return;
    }
    const p = await load(r.urls[surah - 1]);
    await p.seekTo(start);
    stopAt = end;
    p.play();
  } finally {
    set({ loading: false });
  }
}

/** Fetches one ayah ahead (its bytes only), so pressing play starts at once (the ayah of the day). */
export function prefetchAyah(surah: number, ayah: number) {
  const r = timedReciter();
  const i = FIRST[surah] + ayah - 1;
  ayahClip(r.urls[surah - 1], `${r.id}-${surah}-${ayah}`, r.t![2 * i], r.t![2 * i + 1]).catch(() => undefined);
}

/** Plays a whole surah with the chosen recitation (works for every recitation). */
export async function playSurah(surah: number) {
  const r = recitationById(getPrefs().reciter);
  follow = null;
  set({ playing: `surah:${surah}`, loading: true, reciter: r, ayah: null, paused: false });
  try {
    const p = await load(r.urls[surah - 1]);
    stopAt = null;
    await p.seekTo(0);
    p.setPlaybackRate(state.rate);
    p.play();
    showOnLockScreen(p, surah, r);
  } finally {
    set({ loading: false });
  }
}

export const toggleAyah = (surah: number, ayah: number) => (state.playing === `${surah}:${ayah}` ? stop() : playAyah(surah, ayah).catch(() => set({ playing: null, loading: false })));
export const toggleSurah = (surah: number) => (state.playing === `surah:${surah}` ? stop() : playSurah(surah).catch(() => set({ playing: null, loading: false })));

/** «تلاوة: … · الناشر · CC BY-NC-ND عبر رتق» */
export const recitationCredit = (r: Recitation) => `تلاوة: ${r.name}${r.publisher ? ` · ${r.publisher}` : ''} · ${r.license.replace(/-/g, ' ').replace('CC BY NC ND', 'CC BY-NC-ND')} عبر رتق`;

// A new reciter chosen while listening: carry on with the new voice from where the listening is.
let lastReciter = getPrefs().reciter;
onPrefs(() => {
  const id = getPrefs().reciter;
  if (id === lastReciter) return;
  lastReciter = id;
  const now = state.playing;
  if (!now) return;
  const restart = () => {
    if (now === 'page') {
      const [s, a] = (state.ayah ?? `${follow?.surah ?? 1}:1`).split(':').map(Number);
      return playFrom(s, a);
    }
    if (now.startsWith('surah:')) return playSurah(Number(now.slice(6)));
    const [s, a] = now.split(':').map(Number);
    return playAyah(s, a);
  };
  restart().catch(() => stop());
});
