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

