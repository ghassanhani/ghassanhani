// SPEC M2: tashkeel-invariant search + the search test set's top-5 hit rate.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fuse, matchCount, rootInfoIn, searchIndex, terms } from '../src/search/core.ts';
import { quranIndex, readJson, top5, type TestSet } from './helpers.mts';

const { idx, phrases } = quranIndex();
const search = (q: string, n = 5) => searchIndex(idx, q, n, phrases).map((h) => h.key);

// Canonical (fully vowelled) text straight from the bundled source file — never typed here.
const canon = readJson<{ ayat: Record<string, string> }>('assets/content/quran-hafs.json').ayat;
const TASHKEEL = /[ً-ٰٟۖ-ۭـࣰ-ࣿ]/g;

test('searching with and without tashkeel returns the same ayat', () => {
  const keys = Object.keys(canon).filter((_, i) => i % 40 === 0); // 156 ayat spread over the mushaf
  let compared = 0;
  for (const k of keys) {
    const withMarks = canon[k].split(/\s+/).slice(0, 4).join(' ');
    const without = withMarks.replace(TASHKEEL, '');
    assert.notEqual(withMarks, without, `${k} should carry tashkeel in the source`);
    assert.deepEqual(search(withMarks, 10), search(without, 10), k);
    compared++;
  }
  assert.ok(compared > 150);
});

test('a root query finds its derivatives («ر ح م»)', () => {
  const info = rootInfoIn(idx, 'ر ح م');
  assert.ok(info && info.ayat > 200, 'root card');
  assert.equal(search('ر ح م', 10).length, 10);
  assert.ok(search('رحم', 50).some((k) => search('ر ح م', 50).includes(k)));
});

test('an exact phrase ranks its ayah first', () => {
  const k = '2:153';
  const plain = readJson<Record<string, string>>('assets/content/quran-search.json')[k];
  const phrase = plain.split(/\s+/).slice(-4).join(' ');
  assert.equal(search(phrase, 1)[0], k);
});

test('search test set: top-5 hit rate (lexical, offline)', () => {
  const set = readJson<TestSet>('tests/search-testset.json');
  const r = top5(set, (q) => search(q, 5));
  const rate = r.hits / r.total;
  console.log(`  top-5 hit rate (lexical): ${r.hits}/${r.total} = ${(rate * 100).toFixed(0)}%`);
  if (r.misses.length) console.log(`  not in top 5: ${r.misses.join(' · ')}`);
  assert.ok(rate >= BASELINE, `top-5 hit rate fell below the recorded baseline ${BASELINE}`);
});
const BASELINE = 0.5; // raise as the engine improves; never lower without the founder

test('question words and short fragments do not count as topic matches', () => {
  assert.deepEqual(terms('كم ميراث الابن'), ['ميراث', 'الابن']);
  assert.equal(matchCount('باب دعاوكم ايمانكم', 'كم ميراث'), 0); // كم inside a longer word is not a match
  assert.equal(matchCount('فصل الميراث', 'كم ميراث'), 1);
});

test('fusion keeps items found by both rankings on top', () => {
  const a = [{ key: 'x' }, { key: 'y' }];
  const b = [{ key: 'z' }, { key: 'y' }];
  const f = fuse(a, b, 3);
  assert.equal(f[0].key, 'y');
  assert.equal(f[0].via, 'both');
});
