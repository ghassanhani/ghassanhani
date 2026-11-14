import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

/**
 * On-device preferences and progress (plan §13: nothing leaves the device).
 * One JSON blob in AsyncStorage, hydrated once at start-up, exposed through a
 * tiny external store so any screen can read/write it with `usePrefs()`.
 */
export type Madhhab = 'all' | 'hanafi' | 'maliki' | 'shafii' | 'hanbali';

export type Prefs = {
  onboarded: boolean;
  lang: string;
  madhhab: Madhhab;
  goals: Record<string, boolean>;
  locMode: 'city' | 'gps';
  quranSize: number;
  hideTashkeel: boolean;
  theme: 'light' | 'dark' | 'auto';
  notifs: boolean[];
  showSuggested: boolean;
  meaningSearch: boolean; // send the search phrase to the Maknoon Worker for meaning ranking
  analytics: boolean;
  asr: 'j' | 'h';
  city: string; // key in CITIES (manual city; coordinates never leave the device)
  prayerMethod: string | null; // MethodKey; null = the city's suggestion
  prayerAlerts: Record<string, boolean>;
  hifzSlots: boolean[];
  hifzPace: number;
  hifzLock: 'shown' | 'paused' | 'dismissed';
  notes: Record<string, string>;
  installedPacks: string[];
  summaryModel: boolean; // the optional summary model (assistant, level 2) is downloaded and verified
  aiSummary: boolean; // show the automatic summary above the sources when the model is there
  recitationModel: boolean; // the optional speech-model pack is downloaded and verified
  recitationPro: boolean; // the more accurate speech model is downloaded, joined and verified (then used)
  reciter: number; // RATQ recitation id (assets/content/recitations.json)
  lastPage: number | null; // the mushaf page last open (reading position), on the device only
  bookmarks: string[]; // bookmarked ayat, "surah:ayah", newest last
  highlights: string[]; // highlighted ayat, "surah:ayah"
  quranDark: boolean; // the mushaf in dark mode (the rest of the app stays light)
  mushafView: 'page' | 'text'; // the Madinah page line for line, or the flowing text
};

// Defaults = the canvas's initial states.
export const DEFAULT_PREFS: Prefs = {
  onboarded: false,
  lang: 'ar',
  madhhab: 'all',
  goals: { quran: true, hadith: true },
  locMode: 'city',
  quranSize: 24,
  hideTashkeel: false,
  theme: 'auto',
  notifs: [true, true, false, true],
  showSuggested: false, // CLAUDE.md rule 4: reviewed links only by default
  meaningSearch: true,
  analytics: false,
  asr: 'j',
  city: 'barcelona',
  prayerMethod: null,
  prayerAlerts: { fajr: true, sunrise: false, dhuhr: true, asr: true, maghrib: true, isha: true },
  hifzSlots: [true, true, true, false],
  hifzPace: 1,
  hifzLock: 'shown',
  notes: {},
  installedPacks: [],
  summaryModel: false,
  aiSummary: true,
  recitationModel: false,
  recitationPro: false,
  reciter: 35, // إبراهيم الدوسري: complete ayah timings on RATQ
  lastPage: null,
  bookmarks: [],
  highlights: [],
  quranDark: false,
  mushafView: 'page',
};

const KEY = 'maknoon.prefs.v1';
let state: Prefs = DEFAULT_PREFS;
let hydrated = false;
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function emit() {
  listeners.forEach((l) => l());
}

export async function hydratePrefs() {
  if (hydrated) return;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) state = { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Prefs>) };
  } catch {
    state = DEFAULT_PREFS; // corrupt or unavailable storage → start fresh
  }
  hydrated = true;
  emit();
}

export function setPrefs(patch: Partial<Prefs> | ((p: Prefs) => Partial<Prefs>)) {
  const next = typeof patch === 'function' ? patch(state) : patch;
  state = { ...state, ...next };
  emit();
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
  }, 250);
}

export function getPrefs() {
  return state;
}

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function usePrefs(): [Prefs, typeof setPrefs] {
  const p = useSyncExternalStore(subscribe, () => state, () => state);
  return [p, setPrefs];
}

export const MADHHAB_NAMES: Record<Exclude<Madhhab, 'all'>, string> = {
  hanafi: 'الحنفي',
  maliki: 'المالكي',
  shafii: 'الشافعي',
  hanbali: 'الحنبلي',
};
