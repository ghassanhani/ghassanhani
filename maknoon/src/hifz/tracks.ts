/**
 * Hifz program logic (SPEC §2.11) as pure, tested functions. Days are whole day
 * numbers (e.g. days since 1970 in the user's time zone), so nothing here reads a clock.
 *
 *  Sabaq   today's new portion (size chosen by the user)
 *  Sabqi   everything memorized in the last `sabqiDays` (7–20), reviewed daily
 *  Manzil  everything older, split into `manzilDays` equal blocks, one block a day
 *  Weak    portions the user marked weak come back after 1, 3, 7, 14, 30 days
 */
export type Portion = {
  id: string; // e.g. "2:1-5"
  memorizedOn: number; // day number
  weak?: { since: number; step: number }; // step = index into WEAK_INTERVALS
};
export type HifzSettings = { sabqiDays: number; manzilDays: number; lockAfterMissedDays: number };
export const DEFAULT_HIFZ: HifzSettings = { sabqiDays: 14, manzilDays: 7, lockAfterMissedDays: 2 };
export const WEAK_INTERVALS = [1, 3, 7, 14, 30] as const;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n)));

/** The three daily tracks plus the weak portions due today. */
export function tracks(portions: Portion[], today: number, s: HifzSettings = DEFAULT_HIFZ) {
  const sabqiDays = clamp(s.sabqiDays, 7, 20);
  const manzilDays = Math.max(1, Math.round(s.manzilDays));
  const past = portions.filter((p) => p.memorizedOn < today).sort((a, b) => a.memorizedOn - b.memorizedOn || a.id.localeCompare(b.id));
  const sabaq = portions.filter((p) => p.memorizedOn === today);
  const sabqi = past.filter((p) => today - p.memorizedOn <= sabqiDays);
  const older = past.filter((p) => today - p.memorizedOn > sabqiDays);
  // One contiguous block a day; over `manzilDays` days every older portion is seen exactly once.
  const size = Math.ceil(older.length / manzilDays);
  const block = ((today % manzilDays) + manzilDays) % manzilDays;
  const manzil = size ? older.slice(block * size, (block + 1) * size) : [];
  const weak = portions.filter((p) => p.weak && today >= weakDueOn(p.weak));
  return { sabaq, sabqi, manzil, weak };
}

/** Day a weak portion is next due. */
export const weakDueOn = (w: { since: number; step: number }) => w.since + WEAK_INTERVALS[clamp(w.step, 0, WEAK_INTERVALS.length - 1)];

/** After reviewing a weak portion: move to the next interval, or clear the mark after the last one. */
export function reviewedWeak(p: Portion, today: number): Portion {
  if (!p.weak) return p;
  const step = p.weak.step + 1;
  if (step >= WEAK_INTERVALS.length) return { id: p.id, memorizedOn: p.memorizedOn };
  return { ...p, weak: { since: today, step } };
}

/**
 * Review lock: when review has been missed for `lockAfterMissedDays` or more, suggest
 * pausing new material. It is a suggestion — `overridden` always lets the user continue.
 */
export function reviewLock(lastReviewDay: number | null, today: number, hasMemorized: boolean, overridden: boolean, s: HifzSettings = DEFAULT_HIFZ) {
  const missed = !hasMemorized || lastReviewDay === null ? 0 : Math.max(0, today - lastReviewDay - 1);
  const suggested = missed >= s.lockAfterMissedDays;
  return { missed, suggested, locked: suggested && !overridden };
}
