// Audio is 16 kHz, mono, 16-bit PCM (32,000 bytes a second).
const RATE = 16000;
const BPS = RATE * 2;
const FRAME = RATE / 50; // 20 ms of samples
const PAUSE_FRAMES = 12; // a pause of 240 ms or more is a place to cut
const TAIL = BPS * 1; // never cut in the last second (the reciter may be mid-word)

/**
 * Where the reciter last paused, found from the sound itself (not from the model's timestamps,
 * which can be half a second off and split a word): the middle of the latest run of quiet 20 ms
 * frames long enough to be a pause, at least a second before the end. Quiet is measured against
 * this window's own loudness. Returns a byte offset, or -1 when there is no such pause.
 */
export function lastPause(audio: Uint8Array): number {
  const pcm = new Int16Array(audio.buffer, audio.byteOffset, Math.floor(audio.length / 2));
  const n = Math.floor(pcm.length / FRAME);
  if (n < PAUSE_FRAMES * 2) return -1;
  const rms = new Float32Array(n);
  for (let f = 0; f < n; f++) {
    let sum = 0;
    for (let i = f * FRAME; i < (f + 1) * FRAME; i++) sum += pcm[i] * pcm[i];
    rms[f] = Math.sqrt(sum / FRAME);
  }
  const sorted = Array.from(rms).sort((a, b) => a - b);
  const floor = sorted[Math.floor(n * 0.1)];
  const loud = sorted[Math.floor(n * 0.9)];
  const quiet = floor + (loud - floor) * 0.12;
  const lastFrame = Math.floor((audio.length - TAIL) / 2 / FRAME);
  let run = 0;
  for (let f = Math.min(n, lastFrame) - 1; f >= 0; f--) {
    if (rms[f] <= quiet) run++;
    else {
      if (run >= PAUSE_FRAMES) return (f + 1 + Math.floor(run / 2)) * FRAME * 2;
      run = 0;
    }
  }
  return -1;
}


/**
 * The sound as the model gets it, cleaned on the phone: the steady offset and low hum below about
 * 80 Hz removed (a one-pole high-pass), and the level brought up when the voice is quiet (a phone
 * held far away) to a common loudness, never above full scale. Returns a new buffer.
 */
export function clean(audio: Uint8Array): Uint8Array {
  const n = Math.floor(audio.length / 2);
  const src = new Int16Array(audio.buffer, audio.byteOffset, n);
  const out = new Float32Array(n);
  const a = Math.exp((-2 * Math.PI * 80) / RATE);
  let px = 0;
  let py = 0;
  let peak = 0;
  for (let i = 0; i < n; i++) {
    const x = src[i];
    const y = a * (py + x - px);
    px = x;
    py = y;
    out[i] = y;
    const m = Math.abs(y);
    if (m > peak) peak = m;
  }
  // quiet voice: lift it so its loudest part reaches about half of full scale (at most ×8)
  const gain = peak > 0 ? Math.min(8, Math.max(1, 16000 / peak)) : 1;
  const res = new Int16Array(n);
  for (let i = 0; i < n; i++) res[i] = Math.max(-32768, Math.min(32767, Math.round(out[i] * gain)));
  return new Uint8Array(res.buffer);
}
