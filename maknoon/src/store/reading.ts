import { ar, ayatOnPage, getAyah } from '@/content/quran';
import { quranIndex } from '@/content/worship';

/**
 * Where the reader is, worked out from the one thing the app keeps: the last mushaf page open
 * (prefs.lastPage). Every "continue reading" card reads it from here, so they always agree.
 */
export const PAGES = 604;
const plain = (s: string) => s.replace(/[ً-ْٰـ]/g, '');

export type Reading = {
  started: boolean;
  page: number;
  surah: number;
  surahName: string; // without tashkeel, as on the cards
  ayah: number;
  ayat: number; // ayat in that surah
  juz: number;
  progress: number; // through the whole mushaf, 0–1
};

export function readingAt(lastPage: number | null): Reading {
  const page = Math.min(PAGES, Math.max(1, lastPage ?? 1));
  const first = ayatOnPage(page)[0] ?? { surah: 1, ayah: 1 };
  const s = quranIndex.surahs[first.surah - 1];
  const juz = [...quranIndex.juz].reverse().find((j) => j.page <= page)?.juz ?? 1;
  return { started: lastPage != null, page, surah: first.surah, surahName: plain(s?.name ?? ''), ayah: first.ayah, ayat: s?.ayat ?? 0, juz, progress: page / PAGES };
}

export const readingMeta = (r: Reading) => `الآية ${ar(r.ayah)} من ${ar(r.ayat)} · الجزء ${ar(r.juz)}`;

/**
 * The ayah of the day: a different ayah each day, the same for everyone on that day, chosen by
 * plain arithmetic from the ayat of a readable length (a whole thought, not a single word).
 * The text itself is always the canonical text (getAyah).
 */
let POOL: { surah: number; ayah: number }[] | null = null;
export function ayahOfDay(date = new Date()): { surah: number; ayah: number; ref: string } {
  if (!POOL) {
    POOL = [];
    for (const s of quranIndex.surahs)
      for (let a = 1; a <= s.ayat; a++) {
        const n = getAyah(s.n, a)?.text.length ?? 0;
        if (n >= 70 && n <= 200) POOL.push({ surah: s.n, ayah: a });
      }
  }
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  // a fixed stride that is coprime with the pool size walks the whole pool before repeating
  let stride = 2654435761 % POOL.length;
  const g = (a: number, b: number): number => (b ? g(b, a % b) : a);
  while (g(stride, POOL.length) !== 1) stride++;
  const pick = POOL[(day * stride) % POOL.length];
  return { ...pick, ref: `${plain(quranIndex.surahs[pick.surah - 1].name)} : ${ar(pick.ayah)}` };
}

/** «الجزء الثاني عشر»: the juz as the printed mushaf names it at the top of its pages. */
const JUZ = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر', 'الحادي عشر', 'الثاني عشر', 'الثالث عشر', 'الرابع عشر', 'الخامس عشر', 'السادس عشر', 'السابع عشر', 'الثامن عشر', 'التاسع عشر', 'العشرون', 'الحادي والعشرون', 'الثاني والعشرون', 'الثالث والعشرون', 'الرابع والعشرون', 'الخامس والعشرون', 'السادس والعشرون', 'السابع والعشرون', 'الثامن والعشرون', 'التاسع والعشرون', 'الثلاثون'];
export const juzName = (n: number) => `الجزء ${JUZ[n - 1] ?? ar(n)}`;
