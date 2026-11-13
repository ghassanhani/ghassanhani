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
