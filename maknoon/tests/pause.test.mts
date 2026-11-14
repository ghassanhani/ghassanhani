import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lastPause } from '../src/recitation/pause.ts';

const RATE = 16000;
// sound: a 220 Hz tone with a little noise; quiet: low noise only
const make = (parts: [kind: 'tone' | 'quiet', seconds: number][]) => {
  const total = parts.reduce((s, [, sec]) => s + Math.round(sec * RATE), 0);
  const pcm = new Int16Array(total);
  let o = 0;
  let seed = 7;
  const noise = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648 - 0.5) * 200;
  for (const [kind, sec] of parts)
    for (let i = 0; i < Math.round(sec * RATE); i++, o++) pcm[o] = Math.round((kind === 'tone' ? 8000 * Math.sin((2 * Math.PI * 220 * o) / RATE) : 0) + noise());
  return new Uint8Array(pcm.buffer);
};

test('the cut falls in the middle of the last real pause', () => {
  const audio = make([['tone', 2], ['quiet', 0.5], ['tone', 3], ['quiet', 0.4], ['tone', 2.5]]);
  const cut = lastPause(audio) / 2 / RATE;
  assert.ok(cut > 5.5 && cut < 5.9, `cut at ${cut.toFixed(2)} s`);
});

test('no cut inside the last second, and none without a pause', () => {
  assert.equal(lastPause(make([['tone', 6]])), -1);
  const cut = lastPause(make([['tone', 3], ['quiet', 0.5], ['tone', 3], ['quiet', 0.5], ['tone', 0.5]])) / 2 / RATE;
  assert.ok(cut > 3 && cut < 3.5, `cut at ${cut.toFixed(2)} s`);
});

test('a breath shorter than a pause is not a cut', () => {
  assert.equal(lastPause(make([['tone', 3], ['quiet', 0.12], ['tone', 3]])), -1);
});

test('cleaning removes hum and lifts a quiet voice, never clipping', async () => {
  const { clean } = await import('../src/recitation/pause.ts');
  const n = RATE;
  const pcm = new Int16Array(n);
  // a quiet 300 Hz voice over a strong 30 Hz hum and an offset
  for (let i = 0; i < n; i++) pcm[i] = Math.round(500 * Math.sin((2 * Math.PI * 300 * i) / RATE) + 3000 * Math.sin((2 * Math.PI * 30 * i) / RATE) + 1000);
  const out = new Int16Array(clean(new Uint8Array(pcm.buffer)).buffer);
  let mean = 0;
  for (let i = n / 2; i < n; i++) mean += out[i];
  mean /= n / 2;
  assert.ok(Math.abs(mean) < 300, `offset left: ${mean}`);
  let peak = 0;
  for (let i = n / 2; i < n; i++) peak = Math.max(peak, Math.abs(out[i]));
  assert.ok(peak > 1500 && peak <= 32767, `peak ${peak}`);
});

test('fast recitation without a pause is cut at the dip between two words', async () => {
  const { quietestPoint } = await import('../src/recitation/pause.ts');
  // words of 0.5 s with 60 ms dips (too short to be a pause); one dip is a little quieter
  const parts: [kind: 'tone' | 'quiet', seconds: number][] = [];
  for (let i = 0; i < 12; i++) parts.push(['tone', 0.5], ['quiet', 0.06]);
  const audio = make(parts);
  assert.equal(lastPause(audio), -1);
  const cut = quietestPoint(audio) / 2 / RATE;
  // the cut is inside one of the dips, never inside a word
  const inDip = Array.from({ length: 12 }, (_, i) => (i + 1) * 0.56 - 0.06).some((d) => cut >= d - 0.02 && cut <= d + 0.08);
  assert.ok(inDip, `cut at ${cut.toFixed(2)} s`);
});
