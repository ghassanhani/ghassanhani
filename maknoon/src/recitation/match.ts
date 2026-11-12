import { fold } from '../search/arabic.ts';

/**
 * Recitation check — the matching step (SPEC §2.12). Pure code: it compares what a
 * speech model heard with the ayat the reciter meant to recite, and flags only clear
 * differences. No audio, no model and no network here.
 *
 * Tolerated on purpose (never flagged):
 *   · tashkeel, tatweel, Quranic marks, hamza seats, ى/ي, ة/ه   (the shared normalizer)
 *   · a word written as one or as two (two heard words that join into one expected, or the reverse)
 *   · repeating a word or phrase, and extra words (reciters go back and repeat)
 *   · stopping early, unless the caller says the reciter finished
 * Flagged on purpose: any other letter difference. يعلمون for تعلمون is exactly the kind
 * of slip a memorizer needs to hear about, so there is no fuzzy letter matching.
 *
 * Tajweed is out of scope. The wording shown to the user is «تأكد من هذه الكلمة».
 */
export type ExpectedAyah = { key: string; text: string }; // text = plain spelling, used for matching only
export type Flag =
  | { kind: 'missing'; ayah: string; word: number; expected: string }
  | { kind: 'changed'; ayah: string; word: number; expected: string; heard: string }
  | { kind: 'skipped-ayah'; ayah: string };
export type Result = {
  flags: Flag[];
  /** every expected word was reached (nothing left unrecited at the end) */
  complete: boolean;
  /** key of the last ayah with at least one matched word, or null */
  reached: string | null;
  matched: number;
  expected: number;
  /** heard words that matched nothing (repetitions, fillers) — reported, never flagged */
  extra: number;
  /** one entry per expected word, in order: what happened to it so far */
  states: WordState[];
  /** index of the last expected word that was matched, or -1 */
  last: number;
};
export type WordState = 'ok' | 'missing' | 'changed' | 'pending';

/** How many words the matcher sees in a text (the unit `states` and `Flag.word` count in). */
export const wordCount = (text: string): number => text.split(/\s+/).filter((raw) => fold(raw).replace(/ /g, '')).length;
export type Options = {
  /** true when the reciter signalled the end: unrecited words at the end are then flagged as missing */
  finished?: boolean;
};

type Word = { ayah: number; index: number; raw: string; norm: string };

function expectedWords(ayat: ExpectedAyah[]): Word[] {
  const out: Word[] = [];
  ayat.forEach((a, ai) => {
    let i = 0;
    for (const raw of a.text.split(/\s+/)) {
      const norm = fold(raw).replace(/ /g, '');
      if (norm) out.push({ ayah: ai, index: i++, raw, norm });
    }
  });
  return out;
}

const SKIPPED_SHARE = 0.8; // an ayah with this share of its words missing counts as skipped
const WORD = 1; // cost of a missing, changed or extra word

/**
 * Align heard words to expected words (edit distance over words, plus free joins of
 * two words into one on either side), then turn the alignment into flags.
 */
export function check(ayat: ExpectedAyah[], heardText: string, opts: Options = {}): Result {
  const E = expectedWords(ayat);
  const H = fold(heardText).split(' ').filter(Boolean);
  const n = E.length;
  const m = H.length;
  const W = m + 1;
  const cost = new Float32Array((n + 1) * W);
  const step = new Uint8Array((n + 1) * W); // 1 match/changed · 2 missing · 3 extra · 4 one expected = two heard · 5 two expected = one heard
  for (let j = 1; j <= m; j++) {
    cost[j] = j * WORD;
    step[j] = 3;
  }
  for (let i = 1; i <= n; i++) {
    cost[i * W] = i * WORD;
    step[i * W] = 2;
    const e = E[i - 1].norm;
    for (let j = 1; j <= m; j++) {
      const h = H[j - 1];
      let best = cost[(i - 1) * W + (j - 1)] + (e === h ? 0 : WORD);
      let s = 1;
      const miss = cost[(i - 1) * W + j] + WORD;
      if (miss < best) {
        best = miss;
        s = 2;
      }
      const extra = cost[i * W + (j - 1)] + WORD;
      if (extra < best) {
        best = extra;
        s = 3;
      }
      if (j >= 2 && H[j - 2] + h === e) {
        const c = cost[(i - 1) * W + (j - 2)];
        if (c < best) {
          best = c;
          s = 4;
        }
      }
      if (i >= 2 && E[i - 2].norm + e === h) {
        const c = cost[(i - 2) * W + (j - 1)];
        if (c < best) {
          best = c;
          s = 5;
        }
      }
      cost[i * W + j] = best;
      step[i * W + j] = s;
    }
  }

  // Walk back from the end; state[i] says what happened to expected word i.
  const state = new Array<'ok' | 'missing' | { heard: string }>(n);
  let extra = 0;
  // While the reciter is still going, the alignment may stop anywhere in the expected text:
  // take the earliest stopping point with the fewest differences, so a word that occurs again
  // later on the page is not mistaken for the one just recited.
  let stopAt = n;
  if (!opts.finished) {
    stopAt = 0;
    for (let i = 1; i <= n; i++) if (cost[i * W + m] < cost[stopAt * W + m]) stopAt = i;
  }
  for (let k = stopAt; k < n; k++) state[k] = 'missing'; // not reached yet (reported as pending below)
  for (let i = stopAt, j = m; i > 0 || j > 0; ) {
    const s = step[i * W + j];
    if (s === 1) {
      state[i - 1] = E[i - 1].norm === H[j - 1] ? 'ok' : { heard: H[j - 1] };
      i--;
      j--;
    } else if (s === 2) {
      state[i - 1] = 'missing';
      i--;
    } else if (s === 3) {
      extra++;
      j--;
    } else if (s === 4) {
      state[i - 1] = 'ok';
      i--;
      j -= 2;
    } else {
      state[i - 1] = 'ok';
      state[i - 2] = 'ok';
      i -= 2;
      j--;
    }
  }

  // Words after the last one the reciter reached are "not recited yet", not mistakes.
  let last = n - 1;
  while (last >= 0 && state[last] === 'missing') last--;
  const end = opts.finished ? n : last + 1;
  const complete = last === n - 1;

  const flags: Flag[] = [];
  let matched = 0;
  let reached: string | null = null;
  for (let ai = 0; ai < ayat.length; ai++) {
    const idx = E.map((w, k) => (w.ayah === ai ? k : -1)).filter((k) => k >= 0 && k < end);
    const total = E.filter((w) => w.ayah === ai).length;
    if (!idx.length) continue;
    const missing = idx.filter((k) => state[k] === 'missing');
    const ok = idx.filter((k) => state[k] === 'ok');
    matched += ok.length;
    if (ok.length) reached = ayat[ai].key;
    if (idx.length === total && missing.length >= Math.max(1, Math.ceil(total * SKIPPED_SHARE)) && !ok.length) {
      flags.push({ kind: 'skipped-ayah', ayah: ayat[ai].key });
      continue;
    }
    for (const k of idx) {
      const st = state[k];
      if (st === 'ok') continue;
      if (st === 'missing') flags.push({ kind: 'missing', ayah: ayat[ai].key, word: E[k].index, expected: E[k].raw });
      else flags.push({ kind: 'changed', ayah: ayat[ai].key, word: E[k].index, expected: E[k].raw, heard: st.heard });
    }
  }
  const states: WordState[] = E.map((_, k) => {
    const st = state[k];
    return k >= end ? 'pending' : st === 'ok' ? 'ok' : st === 'missing' ? 'missing' : 'changed';
  });
  let lastOk = n - 1;
  while (lastOk >= 0 && state[lastOk] !== 'ok') lastOk--;
  return { flags, complete, reached, matched, expected: n, extra, states, last: lastOk };
}

/** One ayah, checked when the reciter finishes it (SPEC §2.12: "after each ayah"). */
export const checkAyah = (ayah: ExpectedAyah, heardText: string): Result => check([ayah], heardText, { finished: true });

/** The prompt shown for a flag. Never says "wrong": the model can mishear. */
export function prompt(f: Flag): string {
  return f.kind === 'skipped-ayah' ? 'تأكد من هذه الآية' : 'تأكد من هذه الكلمة';
}
