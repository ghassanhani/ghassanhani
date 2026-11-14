import { useEffect, useMemo, useRef, useState } from 'react';
import plain from '../../assets/content/quran-search.json';
import { type Listening, listeningSupported, startListening, warmUp } from './listen';
import { type ExpectedAyah, type WordState, check, wordCount } from './match';
import { modelStatus } from './model';
import { setAudioModeAsync } from 'expo-audio';
import { haptic } from '@/components/motion';
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
  // `now`: all heard (shows the words); `sure`: finished phrases read by the accurate model (judged);
  // `alt`: those phrases' quick reading (a slip counts only where both readings agree)
  const [heardPair, setHeardPair] = useState({ now: '', alt: '', sure: '' });
  const heard = heardPair.now;
  const setHeard = (t: string, alt = t, sure = t) => setHeardPair((p) => (p.now === t && p.alt === alt && p.sure === sure ? p : { now: t, alt, sure }));
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
  const sureRes = useMemo(() => (heardPair.sure ? check(expected, heardPair.sure) : null), [expected, heardPair.sure]);
  const altRes = useMemo(() => (heardPair.alt && heardPair.alt !== heardPair.sure ? check(expected, heardPair.alt) : null), [expected, heardPair.alt, heardPair.sure]);
  // The words shown come from everything heard; slips are judged only on the finished phrases the
  // accurate model has re-read (never on the phrase still being recited), and only where the quick
  // reading of the same audio agrees.
  const result = useMemo(() => {
    if (!raw) return null;
    const id = (f: (typeof raw.flags)[number]) => (f.kind === 'skipped-ayah' ? f.ayah : `${f.ayah}:${f.word}`);
    const both = altRes ? new Set(altRes.flags.map(id)) : null;
    const slips = (sureRes?.flags ?? []).filter((f) => !both || both.has(id(f)));
    const states: (WordState | 'unsure')[] = raw.states.map((st) => (st === 'changed' || st === 'missing' ? 'ok' : st));
    for (const f of slips) {
      const l = layout.map.get(f.ayah);
      if (!l) continue;
      if (f.kind === 'skipped-ayah') for (let k = 0; k < l.count; k++) states[l.offset + k] = 'missing';
      else states[l.offset + f.word] = f.unsure ? 'unsure' : f.kind;
    }
    return { ...raw, flags: slips, states };
  }, [raw, sureRes, altRes, layout]);
  const last = result?.last ?? -1;
  const listeningRef = useRef(false);
  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);
  // Words appear one after another, a little apart, as they are recited (several recognised at once
  // are not dropped on the page together): `shownTo` walks up to the last recited word.
  const [shownTo, setShownTo] = useState(-1);
  // how far the reciter has got: the last word the model heard at all — right or not quite right — so
  // a word heard a little differently still appears at once (whether it is a slip is decided apart)
  const reached = useMemo(() => {
    // from the raw alignment: a word not yet settled as a slip is still a word the reciter said
    const st = raw?.states ?? [];
    for (let i = st.length - 1; i >= 0; i--) if (st[i] === 'ok' || st[i] === 'changed') return i;
    return -1;
  }, [raw]);
  useEffect(() => {
    if (shownTo === reached) return;
    // it only moves forward: a later reading that reconsiders a word does not hide it again (no flashing)
    if (reached < shownTo) return;
    // one by one, but never far behind: the further the reveal lags, the quicker it catches up
    const behind = reached - shownTo;
    const t = setTimeout(() => setShownTo((v) => Math.min(reached, v + (behind > 6 ? 3 : 1))), behind > 3 ? 35 : 90);
    return () => clearTimeout(t);
  }, [shownTo, reached]);
  // «Mistakes»: slips are shown in colour only when the reader asks, or once listening stops
  const [review, setReview] = useState(true); // slips show as they are confirmed; the badge hides them
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
        if (!l || (f.kind !== 'skipped-ayah' && f.unsure)) return false;
        return (f.kind === 'skipped-ayah' ? l.offset + l.count - 1 : l.offset + f.word) < last;
      }),
    [result, layout, last],
  );
  useEffect(() => {
    if (!result) return;
    const fresh = result.flags.filter((f) => {
      const l = layout.map.get(f.ayah);
      if (!l || (f.kind !== 'skipped-ayah' && f.unsure)) return false;
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
    // told at once, quietly: the word turns red and the phone taps lightly — no banner over the page
    // while reciting (the banner names the word once the reader has stopped)
    haptic.warn();
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
  // The speech model is loaded as soon as the page opens, not when the reader taps «start».
  useEffect(() => {
    if (listeningSupported && modelStatus() === 'ready') warmUp();
  }, []);
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
      // listening at once (the page answers the tap); the audio is kept while the model finishes loading
      setListening(true);
      listeningRef.current = true; // at once, not after the next render: the check below reads it
      const s = await startListening((h) => setHeard(`${kept.current} ${h.text}`.trim(), `${keptAlt.current} ${h.alt}`.trim(), `${kept.current} ${h.sure}`.trim()));
      // stopped (or left) while the model was still loading: let the microphone go
      if (!listeningRef.current) void s.cancel().catch(() => undefined);
      else session.current = s;
    } catch {
      setListening(false);
      setNote('mic-failed');
    }
  };

  const stop = async () => {
    stopPreview();
    listeningRef.current = false;
    setListening(false);
    const s = session.current;
    session.current = null;
    if (!s) return;
    try {
      const h = await s.stop();
      kept.current = `${kept.current} ${h.text}`.trim();
      keptAlt.current = `${keptAlt.current} ${h.alt}`.trim();
      setHeard(kept.current, keptAlt.current, kept.current);
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
    listeningRef.current = false;
    void session.current?.cancel().catch(() => {});
    session.current = null;
    kept.current = '';
    keptAlt.current = '';
    announced.current.clear();
    setAlert(null);
    setElapsed(0);
    setHeardPair({ now: '', alt: '', sure: '' });
    setShownTo(-1);
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
    // a word already shown stays shown while the readings settle (no flashing)
    if (flat <= shownTo && st === 'pending') st = 'ok';
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
