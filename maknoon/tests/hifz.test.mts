// SPEC M6: the three tracks are computed from a user's memorized set; the review lock triggers and can be overridden.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_HIFZ, type Portion, WEAK_INTERVALS, reviewLock, reviewedWeak, tracks, weakDueOn } from '../src/hifz/tracks.ts';

const today = 1000;
const set: Portion[] = Array.from({ length: 40 }, (_, i) => ({ id: `p${String(i).padStart(2, '0')}`, memorizedOn: today - i })); // one portion a day, p00 = today

test('sabaq is what was memorized today', () => {
  assert.deepEqual(tracks(set, today).sabaq.map((p) => p.id), ['p00']);
});
test('sabqi is the last 14 days, without today', () => {
  const ids = tracks(set, today).sabqi.map((p) => p.id);
  assert.equal(ids.length, 14);
  assert.ok(ids.includes('p01') && ids.includes('p14') && !ids.includes('p00') && !ids.includes('p15'));
});
test('the sabqi window stays within 7–20 days whatever the setting', () => {
  assert.equal(tracks(set, today, { ...DEFAULT_HIFZ, sabqiDays: 3 }).sabqi.length, 7);
  assert.equal(tracks(set, today, { ...DEFAULT_HIFZ, sabqiDays: 99 }).sabqi.length, 20);
});
test('manzil rotates: over one cycle every older portion is reviewed exactly once', () => {
  const frozen = set.filter((p) => p.memorizedOn < today - 14); // the 25 older portions
  const seen: string[] = [];
  for (let d = 0; d < DEFAULT_HIFZ.manzilDays; d++) {
    // keep the memorized set fixed and only move the rotation day
    const shifted = frozen.map((p) => ({ ...p, memorizedOn: p.memorizedOn - 100 }));
    seen.push(...tracks(shifted, today + d).manzil.map((p) => p.id));
  }
  assert.deepEqual([...seen].sort(), frozen.map((p) => p.id).sort());
});
test('no track overlaps another', () => {
  const t = tracks(set, today);
  const all = [...t.sabaq, ...t.sabqi, ...t.manzil].map((p) => p.id);
  assert.equal(new Set(all).size, all.length);
});
test('an empty set gives empty tracks', () => {
  assert.deepEqual(tracks([], today), { sabaq: [], sabqi: [], manzil: [], weak: [] });
});
test('weak portions return after 1, 3, 7, 14 and 30 days, then the mark clears', () => {
  assert.deepEqual([...WEAK_INTERVALS], [1, 3, 7, 14, 30]);
  let p: Portion = { id: 'w', memorizedOn: today - 50, weak: { since: today, step: 0 } };
  let day = today;
  for (const gap of WEAK_INTERVALS) {
    assert.equal(weakDueOn(p.weak!), day + gap);
    assert.equal(tracks([p], day + gap - 1).weak.length, 0);
    assert.equal(tracks([p], day + gap).weak.length, 1);
    day += gap;
    p = reviewedWeak(p, day);
  }
  assert.equal(p.weak, undefined);
});
test('review lock: suggested after two missed days, and the user can override it', () => {
  assert.equal(reviewLock(today - 1, today, true, false).suggested, false); // reviewed yesterday
  assert.equal(reviewLock(today - 2, today, true, false).suggested, false); // one missed day
  const behind = reviewLock(today - 3, today, true, false);
  assert.deepEqual(behind, { missed: 2, suggested: true, locked: true });
  assert.equal(reviewLock(today - 3, today, true, true).locked, false); // overridden
  assert.equal(reviewLock(null, today, false, false).suggested, false); // nothing memorized yet
});
