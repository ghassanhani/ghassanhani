// Recitations from RATQ (built by pipeline/importers/ratq/recitations.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const data = JSON.parse(readFileSync(new URL('../assets/content/recitations.json', import.meta.url), 'utf8'));
const index = JSON.parse(readFileSync(new URL('../assets/content/quran-index.json', import.meta.url), 'utf8')).surahs as { n: number; ayat: number }[];

test('recitations: every one has 114 surah files on RATQ storage and a licence', () => {
  assert.ok(data.recitations.length >= 30);
  for (const r of data.recitations) {
    assert.equal(r.urls.length, 114, r.name);
    for (const u of r.urls) assert.match(u, /^https:\/\/storage\.cms\.itqan\.dev\/.+\.mp3$/);
    assert.match(r.license, /^CC-BY/);
  }
});

test('recitations: ayah timings, where present, cover all 6,236 ayat and move forward within each surah', () => {
  const timed = data.recitations.filter((r: { t: number[] | null }) => r.t);
  assert.ok(timed.some((r: { id: number }) => r.id === 35), 'the default reciter has timings');
  for (const r of timed) {
    assert.equal(r.t.length, 6236 * 2, r.name);
    let i = 0;
    for (const s of index) {
      let last = -1;
      for (let a = 0; a < s.ayat; a++, i++) {
        const [st, en] = [r.t[2 * i], r.t[2 * i + 1]];
        assert.ok(en > st && st >= last, `${r.name} ${s.n}:${a + 1}`);
        last = st;
      }
    }
  }
});
