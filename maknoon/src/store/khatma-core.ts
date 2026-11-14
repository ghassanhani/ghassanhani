/**
 * Khatma planning, pure and tested (tests/khatma.test.mts). A khatma reads all 604 pages of the
 * Madinah mushaf once, starting at any page and going round to the page before it. It is cut into
 * wirds by one of: a number of days (pages shared as evenly as whole pages allow), or a daily amount
 * — a juz, a hizb (at their real starting pages), or a number of pages.
 */
export const PAGES = 604;

export type Plan = { start: number; unit: 'days' | 'juz' | 'hizb' | 'pages'; amount: number };
export type Wird = { index: number; from: number; to: number; pages: number };

/** Offset of a page from the khatma's start (0 … 603). */
export const offsetOf = (start: number, page: number) => (((page - start) % PAGES) + PAGES) % PAGES;
/** The page at an offset from the start. */
export const pageAt = (start: number, offset: number) => ((start - 1 + offset) % PAGES) + 1;

/**
 * The wirds of a plan, in reading order. `juzStarts` / `hizbStarts` are the pages where each juz /
 * hizb begins (needed only for those units). A wird never splits a page.
 */
export function wirdsOf(p: Plan, juzStarts: number[] = [], hizbStarts: number[] = []): Wird[] {
  let cuts: number[]; // offsets where a wird begins (0 first)
  if (p.unit === 'days') {
    const n = Math.max(1, Math.min(PAGES, Math.round(p.amount)));
    cuts = Array.from({ length: n }, (_, i) => Math.round((i * PAGES) / n));
  } else if (p.unit === 'pages') {
    const n = Math.max(1, Math.round(p.amount));
    cuts = [];
    for (let o = 0; o < PAGES; o += n) cuts.push(o);
  } else {
    const starts = p.unit === 'juz' ? juzStarts : hizbStarts;
    // one wird per `amount` juz/hizb: every amount-th boundary after the start
    const every = Math.max(1, Math.round(p.amount));
    const offs = [...new Set(starts.map((s) => offsetOf(p.start, s)))].sort((a, b) => a - b).filter((o) => o > 0);
    cuts = [0, ...offs.filter((_, i) => (i + 1) % every === 0)];
  }
  cuts = [...new Set(cuts)].sort((a, b) => a - b);
  return cuts.map((o, i) => {
    const end = (i + 1 < cuts.length ? cuts[i + 1] : PAGES) - 1;
    return { index: i, from: pageAt(p.start, o), to: pageAt(p.start, end), pages: end - o + 1 };
  });
}

/** Days and pages a day, for showing one choice in terms of the other. */
export const summary = (w: Wird[]) => ({ days: w.length, perDay: Math.round(PAGES / Math.max(1, w.length)) });

/** True when the reader, turning pages, has just gone past the end of `w` (onto the next page or two). */
export function passedEnd(start: number, w: Wird, page: number): boolean {
  const end = offsetOf(start, w.to);
  const at = offsetOf(start, page);
  return at > end && at - end <= 2;
}
