import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PAGES, offsetOf, passedEnd, wirdsOf } from '../src/store/khatma-core.ts';
import { readJson } from './helpers.mts';

const juz = readJson<{ juz: { page: number }[] }>('assets/content/quran-index.json').juz.map((j) => j.page);
const covers = (w: ReturnType<typeof wirdsOf>, start: number) => {
  // every page exactly once, in order, starting at `start`
  assert.equal(w.reduce((n, x) => n + x.pages, 0), PAGES);
  assert.equal(w[0].from, start);
  for (let i = 1; i < w.length; i++) assert.equal(offsetOf(start, w[i].from), offsetOf(start, w[i - 1].to) + 1);
};

test('by days: the whole mushaf in the chosen number of wirds', () => {
  for (const days of [1, 7, 30, 60, 365]) {
    const w = wirdsOf({ start: 1, unit: 'days', amount: days });
    assert.equal(w.length, days);
    covers(w, 1);
  }
});

test('a juz a day from the start: 30 wirds at the real juz pages', () => {
  const w = wirdsOf({ start: 1, unit: 'juz', amount: 1 }, juz);
  assert.equal(w.length, 30);
  assert.deepEqual(w.map((x) => x.from), juz);
  covers(w, 1);
});

test('starting mid-mushaf goes round to the page before the start', () => {
  const start = juz[14]; // juz 15
  const w = wirdsOf({ start, unit: 'juz', amount: 1 }, juz);
  assert.equal(w.length, 30);
  assert.equal(w[w.length - 1].to, start - 1);
  covers(w, start);
});

test('pages a day and two juz a day', () => {
  covers(wirdsOf({ start: 1, unit: 'pages', amount: 20 }), 1);
  assert.equal(wirdsOf({ start: 1, unit: 'pages', amount: 20 }).length, Math.ceil(PAGES / 20));
  assert.equal(wirdsOf({ start: 1, unit: 'juz', amount: 2 }, juz).length, 15);
});

test('turning just past the end of a wird is noticed, browsing far away is not', () => {
  const w = wirdsOf({ start: 1, unit: 'juz', amount: 1 }, juz)[0];
  assert.equal(passedEnd(1, w, w.to + 1), true);
  assert.equal(passedEnd(1, w, w.to), false);
  assert.equal(passedEnd(1, w, 300), false);
});
