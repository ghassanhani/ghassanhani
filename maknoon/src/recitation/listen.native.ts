import { PermissionsAndroid, Platform } from 'react-native';
import { initWhisper, type WhisperContext } from 'whisper.rn/index';
// @ts-expect-error: the package ships its typings under another module name
import LiveAudioStream from '@fugood/react-native-audio-pcm-stream';
import type { Heard, Listening } from './listen';
import { modelUri } from './model';
import { clean, lastPause, quietestPoint } from './pause';

/**
 * Microphone → on-device Whisper (SPEC §2.12, M10).
 *
 * Privacy: audio is captured as PCM in memory, transcribed on the device and dropped.
 * The stream is opened with no file (`wavFile: ''`), so no recording is ever written; nothing
 * here opens a network connection.
 */
export type { Heard, Listening } from './listen';
export const listeningSupported = true;

let context: Promise<WhisperContext> | null = null;
let contextUri: string | null = null;
function whisper(): Promise<WhisperContext> {
  const uri = modelUri();
  if (!uri) throw new Error('Recitation model not installed');
  // another model chosen (the accurate one installed or removed): let the old one go
  if (context && contextUri !== uri) {
    const old = context;
    context = null;
    old.then((c) => c.release()).catch(() => undefined);
  }
  if (!context) {
    // the phone's GPU (Metal) with flash attention: several times faster than the CPU alone
    const c = initWhisper({ filePath: uri, useGpu: true, useFlashAttn: true });
    c.catch(() => (context = null));
    context = c;
    contextUri = uri;
  }
  return context;
}

/** Loads the speech model ahead (when the Mushaf opens), so the first «start» is immediate. */
export function warmUp() {
  try {
    void whisper().catch(() => undefined);
  } catch {
    // no model installed: nothing to load
  }
}

async function microphoneAllowed(): Promise<boolean> {
  if (Platform.OS !== 'android') return true; // iOS asks when the stream starts (NSMicrophoneUsageDescription)
  const r = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
  return r === PermissionsAndroid.RESULTS.GRANTED;
}

// Audio as it arrives: 16 kHz, mono, 16-bit PCM (32,000 bytes a second), kept in memory only.
const RATE = 16000;
const BPS = RATE * 2;
const MIN_BYTES = BPS * 0.5; // wait for half a second of sound before the first reading
const CUT_AFTER = BPS * 4; // past 4 s, finished phrases are set aside and the window moves on
const HARD_CUT = BPS * 14; // a phrase that never pauses is set aside whole at 14 s
const OVERLAP_MS = 800; // audio kept before a cut, so the next phrase keeps its first word
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
  const kept: string[] = []; // finished phrases, in order: the careful reading
  const keptAlt: string[] = []; // the same phrases, the quick reading (an independent second opinion)
  let open = ''; // the latest reading of the phrase still being recited
  let live = true;
  let job: { stop: () => Promise<void> } | null = null;

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
  const text = () => [...kept, open].filter(Boolean).join(' ');
  const alt = () => [...keptAlt, open].filter(Boolean).join(' ');
  const heard = (): Heard => ({ text: text(), alt: alt() });
  /** One reading of `audio` (cleaned first); `careful` searches five readings instead of taking the first. */
  const transcribe = async (audio: Uint8Array, careful: boolean) => {
    const t = ctx.transcribeData(clean(audio).buffer as ArrayBuffer, careful ? CAREFUL : OPTIONS);
    job = t;
    const r = await t.promise;
    job = null;
    return r;
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
    const segs = r.segments.map((g) => ({ ...g, text: tags(g.text) }));
    if (final) {
      // the last words: the quick reading is the second opinion, then read carefully
      const c = await transcribe(audio, true);
      keptAlt.push(tags(r.result));
      kept.push(tags(c.isAborted ? r.result : c.result));
      open = '';
    } else if (audio.length >= CUT_AFTER && (lastPause(audio) > BPS * 1.5 || quietestPoint(audio) > 0)) {
      // cut in the middle of the reciter's last real pause, or — reciting fast, with no pause — at
      // the quietest dip between two words: never inside a word. What came before is read once
      // more, carefully and whole, and kept; the quick reading of the same stretch beside it
      const pause = lastPause(audio);
      const cut = pause > BPS * 1.5 ? pause : quietestPoint(audio);
      const cutMs = (cut / BPS) * 1000;
      const quick = segs.filter((g) => g.t1 * 10 <= cutMs + 150).map((g) => g.text).filter(Boolean).join(' ');
      const c = await transcribe(audio.slice(0, cut), true);
      if (c.isAborted) return;
      kept.push(tags(c.result));
      keptAlt.push(quick || tags(c.result));
      drop(cut);
      open = '';
    } else if (audio.length >= CUT_AFTER && segs.length >= 2) {
      // keep every phrase but the last; the last one is read again with what follows
      const last = segs[segs.length - 1];
      const done = segs.slice(0, -1).map((g) => g.text).filter(Boolean);
      kept.push(...done);
      keptAlt.push(...done);
      open = last.text;
      // t0 is in 10 ms steps and can come a little late: keep OVERLAP_MS before it, so the phrase's
      // first word is read again rather than lost (a word heard twice is not a mistake)
      drop(Math.max(0, Math.round((last.t0 * 10 - OVERLAP_MS) * (BPS / 1000))));
    } else if (audio.length >= HARD_CUT) {
      const c = await transcribe(audio, true);
      keptAlt.push(tags(r.result));
      kept.push(tags(c.isAborted ? r.result : c.result));
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
      // read again once there is a little new audio (a word's worth), not for every few milliseconds
      while (live && size - before < BPS * 0.35) await new Promise((ok) => setTimeout(ok, 60));
    }
  })();

  const end = async () => {
    live = false;
    await LiveAudioStream.stop().catch(() => undefined);
    sub?.remove?.();
    await job?.stop().catch(() => undefined);
    await loop;
  };

  return {
    async stop() {
      await end();
      if (size >= BPS * 0.3) await read(true).catch(() => undefined); // the last words
      chunks = [];
      size = 0;
      return heard();
    },
    async cancel() {
      await end();
      chunks = [];
      size = 0;
      kept.length = 0;
      keptAlt.length = 0;
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
// A finished phrase is read once more with a beam search over five readings (slower, more
// accurate); the phrase still being recited keeps the quick reading so the page keeps pace.
const CAREFUL = { ...OPTIONS, beamSize: 3, bestOf: 3 }; // three readings searched: most of the gain of five, at well under half the time
