import { useEffect, useMemo, useRef, useState } from 'react';
import plain from '../../assets/content/quran-search.json';
import { type Listening, listeningSupported, startListening } from './listen';
import { type ExpectedAyah, type WordState, check, wordCount } from './match';
import { modelStatus } from './model';
import { setAudioModeAsync } from 'expo-audio';
import { setPrefs } from '@/store/prefs';
import { stop as stopRecitation } from './player';

const PLAIN = plain as Record<string, string>;

/**
 * Live recitation check on a mushaf page (SPEC §2.12, experimental).
 * Words stay hidden until the reciter says them; each partial result from the on-device
 * model is aligned to the page's ayat, so words appear as they are recited.
 *
 *  ok       recited — shown; the latest one is the "current" word
 *  missing  skipped — shown marked, to re-check
 *  changed  heard differently — shown marked, to re-check
 *  pending  not reached yet — hidden
 *  hinted   revealed with the «؟» button — shown marked
 *
 * Audio never leaves the device and is not stored (see listen.native.ts).
 */
export type TasmeeNote = 'web-preview' | 'model-unavailable' | 'model-missing' | 'mic-failed' | null;

export function useTasmee(ayahKeys: string[]) {
  const expected: ExpectedAyah[] = useMemo(() => ayahKeys.map((key) => ({ key, text: PLAIN[key] ?? '' })), [ayahKeys]);
  // Where each ayah's words start in the page's flat word list, and how many it has.
  const layout = useMemo(() => {
    const map = new Map<string, { offset: number; count: number }>();
    let offset = 0;
    for (const e of expected) {
      const count = wordCount(e.text);
      map.set(e.key, { offset, count });
      offset += count;
    }
    return { map, total: offset };
  }, [expected]);

  // everything heard so far on this page, and the reading before it (a slip counts once it holds in both)
  // `alt`: a second, independent reading of the same audio (a slip counts only where both agree)
  const [heardPair, setHeardPair] = useState({ now: '', before: '', alt: '' });
  const heard = heardPair.now;
  const setHeard = (t: string, alt = t) => setHeardPair((p) => (p.now === t && p.alt === alt ? p : { now: t, before: p.now, alt }));
  // Reader's choices in the check: keep unrecited words hidden (recite from memory), and mark slips.
  // «إخفاء الآيات»: unrecited words are hidden at once, before or during listening; starting to
  // listen turns it on (recite from memory), and the reader can turn it off to read along.
  const [hideText, setHideText] = useState(false);
  // Time spent listening on this page (seconds), shown beside the recording dot.
  const [elapsed, setElapsed] = useState(0);
  const [listening, setListening] = useState(false);
  const [hinted, setHinted] = useState<number[]>([]);
  const [note, setNote] = useState<TasmeeNote>(null);
  const kept = useRef(''); // text from earlier listening spells (the reciter may pause and resume)
  const keptAlt = useRef(''); // the second reading of the same spells
  const session = useRef<Listening | null>(null);
  const preview = useRef<ReturnType<typeof setInterval> | null>(null);

  const raw = useMemo(() => (heard ? check(expected, heard) : null), [expected, heard]);
  const previous = useMemo(() => (heardPair.before ? check(expected, heardPair.before) : null), [expected, heardPair.before]);
  const second = useMemo(() => (heardPair.alt && heardPair.alt !== heard ? check(expected, heardPair.alt) : null), [expected, heardPair.alt, heard]);
  // A slip is shown only when it is settled: the same word was flagged in the reading before too
  // (the model's reading of the phrase being recited still changes), and the reciter is at least
  // two words past it. Until then the word just waits, neither red nor green.
  const result = useMemo(() => {
    if (!raw) return null;
    const id = (f: (typeof raw.flags)[number]) => (f.kind === 'skipped-ayah' ? f.ayah : `${f.ayah}:${f.word}`);
    const flat = (f: (typeof raw.flags)[number]) => {
      const l = layout.map.get(f.ayah);
      return l ? (f.kind === 'skipped-ayah' ? l.offset + l.count - 1 : l.offset + f.word) : Infinity;
    };
    // both readings must agree on a slip; a word one reading heard right is right
    const both = second ? new Set(second.flags.map(id)) : null;
    const agreed = (f: (typeof raw.flags)[number]) => !both || both.has(id(f));
    const before = new Set((previous?.flags ?? []).map(id));
    const kept = raw.flags.filter((f) => agreed(f) && (!listening || (before.has(id(f)) && flat(f) <= raw.last - 2)));
    const keep = new Set(kept);
    const states: (WordState | 'unsure')[] = raw.states.map((st) => st);
    for (const f of raw.flags) {
      const l = layout.map.get(f.ayah);
      if (!l) continue;
      if (keep.has(f)) {
        // one close-sounding letter: shown to look at, not counted as a slip
        if (f.kind === 'changed' && f.unsure) states[l.offset + f.word] = 'unsure';
        continue;
      }
      const to = agreed(f) ? 'pending' : 'ok';
      if (f.kind === 'skipped-ayah') for (let k = 0; k < l.count; k++) states[l.offset + k] = to;
      else states[l.offset + f.word] = to;
    }
    return { ...raw, flags: kept, states };
  }, [raw, previous, second, layout, listening]);
  const last = result?.last ?? -1;
  const listeningRef = useRef(false);
  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);
  // Words appear one after another, a little apart, as they are recited (several recognised at once
  // are not dropped on the page together): `shownTo` walks up to the last recited word.
  const [shownTo, setShownTo] = useState(-1);
  useEffect(() => {
    if (shownTo === last) return;
    const t = setTimeout(() => setShownTo((v) => (last < v ? last : Math.min(last, v + 1))), last < shownTo ? 0 : 110);
    return () => clearTimeout(t);
  }, [shownTo, last]);
  // «Mistakes»: slips are shown in colour only when the reader asks, or once listening stops
  const [review, setReview] = useState(false);
  const showSlips = review || !listening;
  const active = listening || !!heard || hinted.length > 0 || hideText;
  useEffect(() => {
    if (!listening) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [listening]);
  // Where the reciter is: the ayah of the last word recited correctly.
  const position = useMemo(() => {
    if (last < 0) return expected[0]?.key ?? null;
    for (const [key, l] of layout.map) if (last >= l.offset && last < l.offset + l.count) return key;
    return null;
  }, [last, layout, expected]);

  // A word to re-check is announced (vibration + a note naming it) as soon as it is certain: the
  // reciter has gone on past it and a later word matched. Each word is announced once.
  const [alert, setAlert] = useState<{ word: string; kind: 'missing' | 'changed' | 'skipped-ayah' } | null>(null);
  const announced = useRef(new Set<string>());
  // Slips that are certain (the reciter has gone on past them): counted on the red badge.
  const confirmed = useMemo(
    () =>
      (result?.flags ?? []).filter((f) => {
        const l = layout.map.get(f.ayah);
        if (!l || (f.kind === 'changed' && f.unsure)) return false;
        return (f.kind === 'skipped-ayah' ? l.offset + l.count - 1 : l.offset + f.word) < last;
      }),
    [result, layout, last],
  );
  useEffect(() => {
    if (!result) return;
    const fresh = result.flags.filter((f) => {
      const l = layout.map.get(f.ayah);
      if (!l || (f.kind === 'changed' && f.unsure)) return false;
      const flat = f.kind === 'skipped-ayah' ? l.offset + l.count - 1 : l.offset + f.word;
      const id = f.kind === 'skipped-ayah' ? f.ayah : `${f.ayah}:${f.word}`;
      return flat < last && !announced.current.has(id);
    });
    if (!fresh.length) return;
    for (const f of fresh) announced.current.add(f.kind === 'skipped-ayah' ? f.ayah : `${f.ayah}:${f.word}`);
    // the notebook keeps every word the check confirmed (on the device only)
    const noted = fresh.filter((x) => x.kind !== 'skipped-ayah');
    if (noted.length)
      setPrefs((p) => {
        const now = Date.now();
        const add = noted.flatMap((x) => ('word' in x ? [{ key: x.ayah, word: x.word, expected: x.expected, heard: x.kind === 'changed' ? x.heard : undefined, at: now }] : []));
        const keep = p.slips.filter((o) => !add.some((a) => a.key === o.key && a.word === o.word));
        return { slips: [...keep, ...add].slice(-200) };
      });
    const f = fresh[fresh.length - 1];
    // as calm as the reading itself: no banner, no vibration while reciting — slips are counted on
    // the badge and shown when the reader asks (or stops)
    if (!listeningRef.current) setAlert({ word: f.kind === 'skipped-ayah' ? '' : f.expected, kind: f.kind });
  }, [result, last, layout]);
  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => setAlert(null), 4000);
    return () => clearTimeout(t);
  }, [alert]);

  const stopPreview = () => {
    if (preview.current) clearInterval(preview.current);
    preview.current = null;
  };
  // Leaving the page stops the microphone and drops whatever was captured.
  useEffect(
    () => () => {
      stopPreview();
      void session.current?.cancel().catch(() => {});
    },
    [],
  );

  const start = async () => {
    if (listening) return;
    if (!listeningSupported) {
      // Web has no speech runtime: play the page's own text word by word so the design can be reviewed.
      setNote('web-preview');
      const words = expected.flatMap((e) => e.text.split(/\s+/).filter(Boolean));
      let i = kept.current ? kept.current.split(' ').length : 0;
      setListening(true);
      setHideText(true);
      preview.current = setInterval(() => {
        i++;
        kept.current = words.slice(0, i).join(' ');
        setHeard(kept.current);
        if (i >= words.length) {
          stopPreview();
          setListening(false);
        }
      }, 420);
      return;
    }
    const status = modelStatus();
    if (status !== 'ready') return setNote(status === 'missing' ? 'model-missing' : 'model-unavailable');
    try {
      setNote(null);
      setHideText(true);
      // a recitation playing would hold the audio session for playback only: stop it and open the mic
      stopRecitation();
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true, shouldPlayInBackground: false }).catch(() => undefined);
      session.current = await startListening((h) => setHeard(`${kept.current} ${h.text}`.trim(), `${keptAlt.current} ${h.alt}`.trim()));
      setListening(true);
    } catch {
      setNote('mic-failed');
    }
  };

  const stop = async () => {
    stopPreview();
    setListening(false);
    const s = session.current;
    session.current = null;
    if (!s) return;
    try {
      const h = await s.stop();
      kept.current = `${kept.current} ${h.text}`.trim();
      keptAlt.current = `${keptAlt.current} ${h.alt}`.trim();
      setHeard(kept.current, keptAlt.current);
    } catch {
      // the last words could not be read: what was heard before stays; the mic itself worked
    }
  };

  /** Reveal the next hidden word. */
  const hint = () => {
    const next = Math.max(last, ...hinted) + 1;
    if (next < layout.total) setHinted((h) => [...h, next]);
  };

  /** Hide everything again and forget what was heard. */
  const reset = () => {
    stopPreview();
    void session.current?.cancel().catch(() => {});
    session.current = null;
    kept.current = '';
    keptAlt.current = '';
    announced.current.clear();
    setAlert(null);
    setElapsed(0);
    setHeardPair({ now: '', before: '', alt: '' });
    setHinted([]);
    setListening(false);
    setNote(null);
    setHideText(false);
  };

  /** State of one displayed word: `index` among the ayah's displayed words, `shown` = how many it displays. */
  const wordState = (ayahKey: string, index: number, shown: number): { state: WordState | 'hinted' | 'unsure'; current: boolean } => {
    const l = layout.map.get(ayahKey);
    if (!l || !l.count) return { state: 'ok', current: false };
    // The search spelling splits a few ayat (61 of 6,236) differently from the displayed text: map by position.
    const i = l.count === shown ? index : Math.min(l.count - 1, Math.round((index * (l.count - 1)) / Math.max(1, shown - 1)));
    const flat = l.offset + i;
    let st = result?.states[flat] ?? 'pending';
    // not reached yet by the word-by-word reveal: still waiting
    if (listening && flat > shownTo && st !== 'pending') st = 'pending';
    // while reciting, a slip reads like any recited word unless the reader asked to see them
    if (!showSlips && (st === 'changed' || st === 'missing' || st === 'unsure')) st = 'ok';
    const current = listening ? flat === shownTo && st === 'ok' : st === 'ok' && flat === last;
    // A word shown by the hint button stays marked, even once it is recited.
    if (hinted.includes(flat) && !current) return { state: 'hinted', current: false };
    // with the text shown, words not yet recited read normally; with marks off, slips read normally
    if (st === 'pending' && !hideText) return { state: 'ok', current: false };
    return { state: st, current };
  };

  /** What the model heard where a word is marked (a changed word), '' for a word not heard at all. */
  const heardAt = (ayahKey: string, index: number, shown: number): string | null => {
    const l = layout.map.get(ayahKey);
    if (!l || !l.count || !result) return null;
    const i = l.count === shown ? index : Math.min(l.count - 1, Math.round((index * (l.count - 1)) / Math.max(1, shown - 1)));
    const f = result.flags.find((x) => x.kind !== 'skipped-ayah' && x.ayah === ayahKey && x.word === i);
    return f ? (f.kind === 'changed' ? f.heard : '') : null;
  };

  return { active, listening, note, alert, start, stop, hint, reset, wordState, heardAt, review: showSlips, toggleReview: () => setReview((v) => !v), done: !!result?.complete, errors: confirmed.length, position, elapsed, hideText, setHideText };
}
