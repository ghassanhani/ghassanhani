import { PermissionsAndroid, Platform } from 'react-native';
import { initWhisper, type WhisperContext } from 'whisper.rn/index';
// @ts-expect-error: the package ships its typings under another module name
import LiveAudioStream from '@fugood/react-native-audio-pcm-stream';
import type { Heard, Listening } from './listen';
import { modelUris } from './model';
import { clean, lastPause } from './pause';

/**
 * Microphone → on-device Whisper (SPEC §2.12, M10).
 *
 * Privacy: audio is captured as PCM in memory, transcribed on the device and dropped.
 * The stream is opened with no file (`wavFile: ''`), so no recording is ever written; nothing
 * here opens a network connection.
 */
export type { Heard, Listening } from './listen';
export const listeningSupported = true;

// One context per model file, kept while it is installed.
const contexts = new Map<string, Promise<WhisperContext>>();
function load(uri: string): Promise<WhisperContext> {
  let c = contexts.get(uri);
  if (!c) {
    // the phone's GPU (Metal): several times faster than the CPU alone
    c = initWhisper({ filePath: uri, useGpu: true });
    c.catch(() => contexts.delete(uri));
    contexts.set(uri, c);
  }
  return c;
}
/** The fast and the accurate model (the same one when only one is installed). */
async function whisper(): Promise<{ fast: WhisperContext; accurate: WhisperContext }> {
  const u = await modelUris();
  // a model removed since: let it go
  for (const [uri, c] of contexts) if (uri !== u.fast && uri !== u.accurate) {
    contexts.delete(uri);
    c.then((x) => x.release()).catch(() => undefined);
  }
  const [fast, accurate] = await Promise.all([load(u.fast), load(u.accurate)]);
  return { fast, accurate };
}

/** Loads the speech model ahead (when the Mushaf opens), so the first «start» is immediate. */
export function warmUp() {
  try {
    void whisper().catch(() => undefined);
  } catch {
    // no model installed: nothing to load
  }
}

/**
 * One reading at a time per model (whisper refuses a second while one runs): readings wait their
 * turn here, and the live reading of the words always goes before a background re-read.
 */
const queues = new Map<WhisperContext, { busy: boolean; waiting: { live: boolean; go: () => void }[] }>();
function turn(model: WhisperContext, live: boolean): Promise<() => void> {
  let q = queues.get(model);
  if (!q) queues.set(model, (q = { busy: false, waiting: [] }));
  const lane = q;
  const release = () => {
    const i = lane.waiting.findIndex((w) => w.live);
    const next = lane.waiting.splice(i >= 0 ? i : 0, 1)[0];
    if (next) next.go();
    else lane.busy = false;
  };
  if (!lane.busy) {
    lane.busy = true;
    return Promise.resolve(release);
  }
  return new Promise((ok) => lane.waiting.push({ live, go: () => ok(release) }));
}

/**
 * The encoder's window, sized to the audio (whisper otherwise encodes a full 30 s for every
 * reading): in 20 ms frames, with a margin, in steps of 64. Measured on recitation audio with the
 * Tarteel base model: about three times faster, the same words out.
 */
const audioCtx = (bytes: number) => Math.min(1500, Math.ceil((Math.ceil((bytes / BPS) * 50) + 64) / 64) * 64);

async function microphoneAllowed(): Promise<boolean> {
  if (Platform.OS !== 'android') return true; // iOS asks when the stream starts (NSMicrophoneUsageDescription)
  const r = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
  return r === PermissionsAndroid.RESULTS.GRANTED;
}

// Audio as it arrives: 16 kHz, mono, 16-bit PCM (32,000 bytes a second), kept in memory only.
const RATE = 16000;
const BPS = RATE * 2;
const MIN_BYTES = BPS * 0.5; // wait for half a second of sound before the first reading
const CUT_AFTER = BPS * 3; // past 3 s, finished phrases are set aside and the window moves on
const HARD_CUT = BPS * 14; // a phrase that never pauses is set aside whole at 14 s
// whisper.cpp writes noise and silence as bracketed tags: never part of what was recited
const tags = (t: string) => t.replace(/\[[^\]]*\]|\([^)]*\)|\*[^*]*\*/g, ' ').replace(/\s+/g, ' ').trim();

const decode = (b64: string) => {
  const bin = globalThis.atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

/**
 * Live listening, as a single loop that always reads the newest audio (so it keeps pace with the
 * reciter and never falls behind): the open phrase is read again every time the previous reading
 * finishes; once the window is long enough, every phrase before the last pause the model found is
 * kept and its audio dropped. Nothing is cut mid-word, and no reading waits in a queue.
 */
export async function startListening(onHeard?: (soFar: Heard) => void): Promise<Listening> {
  if (!(await microphoneAllowed())) throw new Error('Microphone permission denied');
  // The microphone opens at once and keeps every sample while the model loads (a second or two
  // the first time): the reciter who starts straight away loses nothing.
  const loading = whisper();

  let chunks: Uint8Array[] = [];
  let size = 0;
  // finished phrases, in order: the fast model's reading (`quick`), and the accurate model's re-read of
  // the same audio (`sure`), done in the background so the live reading never waits for it
  const phrases: { quick: string; sure: string | null }[] = [];
  let checking: Promise<void> = Promise.resolve();
  const jobs = new Set<{ stop: () => Promise<void> }>();
  let open = ''; // the latest reading of the phrase still being recited
  let live = true;

  const window = () => {
    const out = new Uint8Array(size);
    let o = 0;
    for (const c of chunks) {
      out.set(c, o);
      o += c.length;
    }
    return out;
  };
  /** Drops the first `bytes` of the window (whole samples). */
  const drop = (bytes: number) => {
    const all = window();
    const cut = Math.min(size, bytes - (bytes % 2));
    chunks = [all.slice(cut)];
    size = all.length - cut;
  };
  const text = () => [...phrases.map((p) => p.sure ?? p.quick), open].filter(Boolean).join(' ');
  // slips are judged only on the finished phrases the accurate model has re-read (from the first, in
  // order), never on the phrase still being recited
  const heard = (): Heard => {
    const done = phrases.slice(0, ((i) => (i < 0 ? phrases.length : i))(phrases.findIndex((p) => p.sure === null)));
    return { text: text(), alt: done.map((p) => p.quick).filter(Boolean).join(' '), sure: done.map((p) => p.sure).filter(Boolean).join(' ') };
  };
  /** One reading of `audio` (cleaned first); `careful`: a finished phrase, re-read to confirm it. */
  const transcribe = async (audio: Uint8Array, careful: boolean) => {
    // words as they come: the fast model; a finished phrase: the accurate one (with one model only,
    // the same model searching three readings instead of taking the first)
    const model = careful ? ctx.accurate : ctx.fast;
    const options = { ...(careful && ctx.accurate === ctx.fast ? CAREFUL : OPTIONS), audioCtx: audioCtx(audio.length) };
    // a model reads one thing at a time: wait for its turn (the live reading goes first)
    const release = await turn(model, !careful);
    try {
      const t = model.transcribeData(clean(audio).buffer as ArrayBuffer, options);
      jobs.add(t);
      try {
        return await t.promise;
      } finally {
        jobs.delete(t);
      }
    } finally {
      release();
    }
  };
  /**
   * A phrase is finished: keep the reading that ended it (`quick`, the second opinion), and have the
   * accurate model read the phrase's own audio in turn (the reading slips are judged on). `same`:
   * `audio` is exactly what `quick` was read from.
   */
  const finish = (quick: string, audio: Uint8Array, same: boolean) => {
    // the very audio just read, and one model only: a second reading would say the same
    if (same && ctx.accurate === ctx.fast) {
      phrases.push({ quick, sure: quick });
      return;
    }
    const p = { quick, sure: null as string | null };
    phrases.push(p);
    checking = checking
      .then(async () => {
        const c = await transcribe(audio, true);
        p.sure = c.isAborted ? quick : tags(c.result);
      })
      .catch(() => {
        p.sure = quick;
      })
      .then(() => onHeard?.(heard()));
  };

  LiveAudioStream.init({ sampleRate: RATE, channels: 1, bitsPerSample: 16, audioSource: 6, bufferSize: 4096, wavFile: '' });
  const sub = LiveAudioStream.on('data', (b64: string) => {
    if (!live) return;
    const c = decode(b64);
    chunks.push(c);
    size += c.length;
  });
  LiveAudioStream.start();
  let ctx: Awaited<ReturnType<typeof whisper>>;
  try {
    ctx = await loading;
  } catch (e) {
    live = false;
    sub?.remove?.();
    await LiveAudioStream.stop().catch(() => undefined);
    throw e;
  }

  const read = async (final: boolean) => {
    const audio = window();
    const r = await transcribe(audio, false);
    if (r.isAborted) return;
    // (the Quran models give no word timings: every reading is one block from 0 to 30 s, so the text
    // of a phrase is never picked out of a longer reading by time — its audio is read on its own)
    if (final) {
      // the last words
      finish(tags(r.result), audio, true);
      open = '';
    } else if (audio.length >= CUT_AFTER && lastPause(audio) > BPS * 1.5) {
      // cut in the middle of the reciter's last real pause (never between two words said in one
      // breath: cut there, words were split and misread). The phrase before it is read on its own
      // and kept; this reading of the whole window is its second opinion.
      const cut = lastPause(audio);
      finish(tags(r.result), audio.slice(0, cut), false);
      drop(cut);
      open = '';
    } else if (audio.length >= HARD_CUT) {
      // no pause for 14 s: set the whole window aside
      finish(tags(r.result), audio, true);
      open = '';
      drop(audio.length);
    } else open = tags(r.result);
    onHeard?.(heard());
  };

  const loop = (async () => {
    while (live) {
      if (size < MIN_BYTES) {
        await new Promise((ok) => setTimeout(ok, 120));
        continue;
      }
      const before = size;
      await read(false).catch(() => undefined);
      // read again once there is a little new audio (a fifth of a second), not for every few milliseconds
      while (live && size - before < BPS * 0.2) await new Promise((ok) => setTimeout(ok, 60));
    }
  })();

  const end = async () => {
    live = false;
    await LiveAudioStream.stop().catch(() => undefined);
    sub?.remove?.();
    await loop;
  };

  return {
    async stop() {
      await end();
      if (size >= BPS * 0.3) await read(true).catch(() => undefined); // the last words
      await checking; // every phrase re-read by the accurate model before the final result
      chunks = [];
      size = 0;
      return heard();
    },
    async cancel() {
      await end();
      chunks = [];
      size = 0;
      await Promise.all([...jobs].map((j) => j.stop().catch(() => undefined)));
      phrases.length = 0;
    },
  };
}

const OPTIONS = {
  language: 'ar',
  // Each reading stands alone: no earlier text as a hint, the most likely reading of the audio,
  // no retries at higher temperature. The model was trained on the Quran; given the chance it
  // completes a passage from memory instead of writing what it heard.
  maxContext: 0,
  temperature: 0,
  temperatureInc: 0,
  beamSize: 1,
  maxThreads: 4,
};
// A finished phrase is re-read whole (its full context, cut at a pause). Beam search was measured
// on recitation audio and gave the same words at three times the cost, so every reading is greedy:
// a slower search would hold up the live reading behind it.
const CAREFUL = OPTIONS;
