import { useEffect, useMemo, useRef, useState } from 'react';
import plain from '../../assets/content/quran-search.json';
import { type Listening, listeningSupported, startListening } from './listen';
import { type ExpectedAyah, type WordState, check, wordCount } from './match';
import { modelStatus } from './model';
import { setAudioModeAsync } from 'expo-audio';
import { haptic } from '@/components/motion';
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

  const [heard, setHeard] = useState(''); // everything heard so far on this page
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
  const session = useRef<Listening | null>(null);
  const preview = useRef<ReturnType<typeof setInterval> | null>(null);

  const result = useMemo(() => (heard ? check(expected, heard) : null), [expected, heard]);
  const last = result?.last ?? -1;
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
        if (!l) return false;
        return (f.kind === 'skipped-ayah' ? l.offset + l.count - 1 : l.offset + f.word) < last;
      }),
    [result, layout, last],
  );
  useEffect(() => {
    if (!result) return;
    const fresh = result.flags.filter((f) => {
      const l = layout.map.get(f.ayah);
      if (!l) return false;
      const flat = f.kind === 'skipped-ayah' ? l.offset + l.count - 1 : l.offset + f.word;
      const id = f.kind === 'skipped-ayah' ? f.ayah : `${f.ayah}:${f.word}`;
      return flat < last && !announced.current.has(id);
    });
    if (!fresh.length) return;
    for (const f of fresh) announced.current.add(f.kind === 'skipped-ayah' ? f.ayah : `${f.ayah}:${f.word}`);
    const f = fresh[fresh.length - 1];
    haptic.warn();
    setAlert({ word: f.kind === 'skipped-ayah' ? '' : f.expected, kind: f.kind });
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
      session.current = await startListening((t) => setHeard(`${kept.current} ${t}`.trim()));
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
      kept.current = `${kept.current} ${await s.stop()}`.trim();
      setHeard(kept.current);
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
    announced.current.clear();
    setAlert(null);
    setElapsed(0);
    setHeard('');
    setHinted([]);
    setListening(false);
    setNote(null);
    setHideText(false);
  };

  /** State of one displayed word: `index` among the ayah's displayed words, `shown` = how many it displays. */
  const wordState = (ayahKey: string, index: number, shown: number): { state: WordState | 'hinted'; current: boolean } => {
    const l = layout.map.get(ayahKey);
    if (!l || !l.count) return { state: 'ok', current: false };
    // The search spelling splits a few ayat (61 of 6,236) differently from the displayed text: map by position.
    const i = l.count === shown ? index : Math.min(l.count - 1, Math.round((index * (l.count - 1)) / Math.max(1, shown - 1)));
    const flat = l.offset + i;
    const st = result?.states[flat] ?? 'pending';
    const current = st === 'ok' && flat === last;
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

  return { active, listening, note, alert, start, stop, hint, reset, wordState, heardAt, done: !!result?.complete, errors: confirmed.length, position, elapsed, hideText, setHideText };
}
