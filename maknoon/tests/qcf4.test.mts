// The Madinah page data that ships with the app: built by pipeline/importers/qcf4, which ties
// every glyph to the KFGQPC Hafs text. These checks guard the committed file.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const data = JSON.parse(readFileSync(new URL('../assets/content/qcf4-pages.json', import.meta.url), 'utf8'));
const hafs = JSON.parse(readFileSync(new URL('../assets/content/quran-hafs.json', import.meta.url), 'utf8')).ayat;

test('qcf4: 604 pages of 15 lines (8 on the first two)', () => {
  assert.equal(data.pages.length, 604);
  data.pages.forEach((p: { l: unknown[] }, i: number) => assert.equal(p.l.length, i < 2 ? 8 : 15, `page ${i + 1}`));
});

test('qcf4: every ayah appears, in order, with exactly one end mark', () => {
  const seen: number[] = [];
  const endMarks = new Map<number, number>();
  for (const p of data.pages)
    for (const l of p.l) {
      if (!('g' in l)) continue;
      assert.equal(Array.from(l.g as string).length, l.a.length);
      assert.equal(l.a.length, l.i.length);
      l.a.forEach((a: number, k: number) => {
        if (!a) return;
        if (seen[seen.length - 1] !== a) seen.push(a);
        if (l.i[k] === -1) endMarks.set(a, (endMarks.get(a) ?? 0) + 1);
      });
    }
  const n = Object.keys(hafs).length;
  assert.equal(seen.length, n);
  seen.forEach((a, k) => assert.equal(a, k + 1));
  for (let a = 1; a <= n; a++) assert.equal(endMarks.get(a), 1, `ayah ${a}`);
});

test('qcf4: each ayah shows every Hafs word, in order', () => {
  const keys = Object.keys(hafs);
  const MARK = /^[-ﭐ-﷿ﹰ-﻿۝۞۩٠-٩]+$/;
  const words = new Map<number, number[]>();
  for (const p of data.pages)
    for (const l of p.l) if ('g' in l) l.a.forEach((a: number, k: number) => a && l.i[k] >= 0 && (words.get(a) ?? words.set(a, []).get(a)!).push(l.i[k]));
  keys.forEach((key, k) => {
    const want = hafs[key].split(/\s+/).filter((t: string) => t && !MARK.test(t)).length;
    const got = [...new Set(words.get(k + 1))];
    assert.deepEqual(got, Array.from({ length: want }, (_, i) => i), key);
  });
});

test('qcf4: 114 surah headers and 112 basmalas', () => {
  const lines = data.pages.flatMap((p: { l: object[] }) => p.l);
  assert.equal(lines.filter((l: object) => 'h' in l).length, 114);
  assert.equal(lines.filter((l: object) => 'b' in l).length, 112);
});
