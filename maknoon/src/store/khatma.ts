import { createHafs } from 'quran-meta';
import { pageOfAyah } from '@/content/qcf4';
import { ar, ayatOnPage } from '@/content/quran';
import { quranIndex } from '@/content/worship';
import { getPrefs, type Prefs, setPrefs, usePrefs } from './prefs';
import { type Plan, type Wird, passedEnd, summary, wirdsOf } from './khatma-core';

export type { Plan, Wird } from './khatma-core';
export { summary, wirdsOf } from './khatma-core';

/** Pages where each juz begins (the Madinah mushaf). */
export const juzStarts = quranIndex.juz.map((j) => j.page);
/** Pages where each of the 60 hizb begins (first ayah of every fourth quarter, then its page). */
let HIZB: number[] | null = null;
export function hizbStarts(): number[] {
  if (!HIZB) {
    const q = createHafs();
    HIZB = Array.from({ length: 60 }, (_, h) => {
      const [s, a] = q.getRubAlHizbMeta((h * 4 + 1) as Parameters<typeof q.getRubAlHizbMeta>[0]).first as [number, number];
      return pageOfAyah(`${s}:${a}`) ?? 1;
    });
  }
  return HIZB;
}

export const planWirds = (p: Plan): Wird[] => wirdsOf(p, juzStarts, p.unit === 'hizb' ? hizbStarts() : []);

const name = (s: number) => quranIndex.surahs[s - 1]?.name ?? '';
/** «من البقرة ١٤٢ إلى البقرة ٢٥٢» for a wird (its first ayah to its last). */
export function wirdRange(w: Wird): string {
  const first = ayatOnPage(w.from)[0];
  const lastPage = ayatOnPage(w.to);
  const last = lastPage[lastPage.length - 1];
  if (!first || !last) return `ص ${ar(w.from)}–${ar(w.to)}`;
  return `من ${name(first.surah)} ${ar(first.ayah)} إلى ${name(last.surah)} ${ar(last.ayah)}`;
}

/** The plan in words: «جزء كل يوم · ٣٠ يومًا». */
export function planLabel(p: Plan): string {
  const w = planWirds(p);
  const days = `${ar(w.length)} ${w.length === 1 ? 'يوم' : w.length <= 10 ? 'أيام' : 'يومًا'}`;
  if (p.unit === 'days') return `${days} · نحو ${ar(summary(w).perDay)} صفحة يوميًا`;
  if (p.unit === 'pages') return `${ar(p.amount)} صفحات كل يوم · ${days}`;
  const unit = p.unit === 'juz' ? 'جزء' : 'حزب';
  return `${p.amount === 1 ? unit : `${ar(p.amount)} ${unit}`} كل يوم · ${days}`;
}

type K = NonNullable<Prefs['khatma']>;
export function startKhatma(plan: Plan, remind: number | null = null) {
  setPrefs({ khatma: { plan, startedAt: Date.now(), done: 0, doneAt: [], remind } });
}
export function stopKhatma() {
  setPrefs({ khatma: null });
}
export function setReminder(remind: number | null) {
  setPrefs((p) => (p.khatma ? { khatma: { ...p.khatma, remind } } : {}));
}
/** The current wird is read: the next one becomes today's; the last one finishes the khatma. */
export function markWird() {
  setPrefs((p) => {
    const k = p.khatma;
    if (!k) return {};
    const total = planWirds(k.plan).length;
    const done = k.done + 1;
    if (done >= total) return { khatma: null, khatmaHistory: [...p.khatmaHistory, { startedAt: k.startedAt, finishedAt: Date.now() }] };
    return { khatma: { ...k, done, doneAt: [...k.doneAt, Date.now()] } };
  });
}
/** Turning a page in the mushaf: past the end of today's wird, it counts as read. */
export function noticePage(page: number) {
  const k = getPrefs().khatma;
  if (!k) return;
  const w = planWirds(k.plan)[k.done];
  if (w && passedEnd(k.plan.start, w, page)) markWird();
}

/** The khatma as the screens show it. */
export function useKhatma() {
  const [prefs] = usePrefs();
  const k: K | null = prefs.khatma;
  const wirds = k ? planWirds(k.plan) : [];
  return { k, wirds, today: k ? (wirds[k.done] ?? null) : null, history: prefs.khatmaHistory, seconds: prefs.mushafSeconds };
}


/** Where a wird begins and ends: its first and last ayah, and its pages. */
export function wirdEnds(w: Wird) {
  const firstPage = ayatOnPage(w.from);
  const lastPage = ayatOnPage(w.to);
  return { first: firstPage[0] ?? { surah: 1, ayah: 1 }, last: lastPage[lastPage.length - 1] ?? { surah: 114, ayah: 6 } };
}
/** The juz a page is in. */
export const juzOfPage = (page: number) => [...quranIndex.juz].reverse().find((j) => j.page <= page)?.juz ?? 1;
