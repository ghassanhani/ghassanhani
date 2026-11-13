// SPEC §2.12 matching step. Every expected text is read from the app's Quran files;
// mistakes are made by script (drop a word, swap a word, skip an ayah) — nothing is typed here.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { check, checkAyah, prompt, wordCount, type ExpectedAyah } from '../src/recitation/match.ts';
import { fold } from '../src/search/arabic.ts';
import { readJson } from './helpers.mts';

const plain = readJson<Record<string, string>>('assets/content/quran-search.json');
const canon = readJson<{ ayat: Record<string, string> }>('assets/content/quran-hafs.json').ayat;
const keys = Object.keys(plain);
const ayah = (k: string): ExpectedAyah => ({ key: k, text: plain[k] });
const words = (k: string) => plain[k].split(/\s+/).filter(Boolean);
const sample = keys.filter((_, i) => i % 13 === 0); // 480 ayat spread over the mushaf

test('a correct recitation raises no flag — all 6,236 ayat', () => {
  for (const k of keys) {
    const r = checkAyah(ayah(k), plain[k]);
    assert.equal(r.flags.length, 0, k);
    assert.equal(r.complete, true, k);
  }
});

test('tashkeel in what was heard makes no difference', () => {
  // Use the fully vowelled canonical text wherever it spells the ayah with the same letters.
  let compared = 0;
  for (const k of sample) {
    if (fold(canon[k]) !== fold(plain[k])) continue; // Uthmani spelling differs for this ayah
    assert.equal(checkAyah(ayah(k), canon[k]).flags.length, 0, k);
    compared++;
  }
  assert.ok(compared > 20, `only ${compared} ayat compared`);
});

test('a dropped word is caught (catch rate 100% on the sample)', () => {
  let cases = 0;
  for (const k of sample) {
    const w = words(k);
    if (w.length < 3) continue;
    const i = Math.floor(w.length / 2);
    const r = checkAyah(ayah(k), [...w.slice(0, i), ...w.slice(i + 1)].join(' '));
    assert.ok(r.flags.length >= 1, `${k}: nothing flagged`);
    assert.ok(r.flags.every((f) => f.kind === 'missing'), k);
    assert.equal(r.flags.length, 1, k);
    cases++;
  }
  assert.ok(cases > 400);
});

test('a changed word is caught and reported with what was heard', () => {
  let cases = 0;
  for (let s = 0; s + 1 < sample.length; s++) {
    const k = sample[s];
    const w = words(k);
    const other = words(sample[s + 1]).find((x) => !w.some((y) => fold(y) === fold(x)));
    if (w.length < 3 || !other) continue;
    const i = Math.floor(w.length / 2);
    const heard = [...w.slice(0, i), other, ...w.slice(i + 1)].join(' ');
    const r = checkAyah(ayah(k), heard);
    assert.equal(r.flags.length, 1, k);
    const f = r.flags[0];
    assert.equal(f.kind, 'changed', k);
    if (f.kind === 'changed') {
      assert.equal(f.word, i, k);
      assert.equal(f.heard, fold(other), k);
    }
    cases++;
  }
  assert.ok(cases > 400);
});

test('a one-letter slip is flagged, not forgiven', () => {
  // Swap the first letter of a long word for another letter: a classic memorization slip.
  let cases = 0;
  for (const k of sample) {
    const w = words(k);
    const i = w.findIndex((x) => fold(x).length >= 5);
    if (i < 0) continue;
    const f0 = fold(w[i]);
    const slipped = (f0[0] === 'ت' ? 'ي' : 'ت') + f0.slice(1);
    if (w.some((x) => fold(x) === slipped)) continue;
    const r = checkAyah(ayah(k), [...w.slice(0, i), slipped, ...w.slice(i + 1)].join(' '));
    assert.equal(r.flags.length, 1, k);
    assert.equal(r.flags[0].kind, 'changed', k);
    cases++;
  }
  assert.ok(cases > 300);
});

test('a skipped ayah is reported once, not word by word', () => {
  let cases = 0;
  for (let i = 0; i + 2 < keys.length; i += 97) {
    const [a, b, c] = [keys[i], keys[i + 1], keys[i + 2]];
    if (a.split(':')[0] !== c.split(':')[0]) continue; // keep the passage inside one surah
    if (words(b).length < 3 || fold(plain[a]).includes(fold(plain[b])) || fold(plain[c]).includes(fold(plain[b]))) continue;
    const r = check([ayah(a), ayah(b), ayah(c)], `${plain[a]} ${plain[c]}`, { finished: true });
    const skipped = r.flags.filter((f) => f.kind === 'skipped-ayah');
    if (skipped.length !== 1 || r.flags.length !== 1) {
      // ayat that share most of their words with a neighbour can align differently; they must still be flagged
      assert.ok(r.flags.length >= 1, `${b}: nothing flagged`);
      continue;
    }
    assert.equal(skipped[0].ayah, b);
    cases++;
  }
  assert.ok(cases > 40, `only ${cases} clean cases`);
});

test('repeating a phrase raises no flag', () => {
  for (const k of sample) {
    const w = words(k);
    if (w.length < 4) continue;
    const heard = [...w.slice(0, 2), ...w.slice(0, 2), ...w.slice(2)].join(' '); // went back and repeated the opening
    const r = checkAyah(ayah(k), heard);
    assert.equal(r.flags.length, 0, k);
    assert.equal(r.extra, 2, k);
  }
});

test('stopping early is not a mistake until the reciter says they finished', () => {
  for (const k of sample) {
    const w = words(k);
    if (w.length < 5) continue;
    const heard = w.slice(0, w.length - 2).join(' ');
    const open = check([ayah(k)], heard);
    assert.equal(open.flags.length, 0, k);
    assert.equal(open.complete, false, k);
    const closed = check([ayah(k)], heard, { finished: true });
    assert.equal(closed.flags.filter((f) => f.kind === 'missing').length, 2, k);
  }
});

test('a word heard as two, or two heard as one, is tolerated', () => {
  let cases = 0;
  for (const k of sample) {
    const w = words(k);
    const i = w.findIndex((x) => fold(x).length >= 6);
    if (i >= 0) {
      const f0 = fold(w[i]);
      const split = `${f0.slice(0, 3)} ${f0.slice(3)}`;
      assert.equal(checkAyah(ayah(k), [...w.slice(0, i), split, ...w.slice(i + 1)].join(' ')).flags.length, 0, `${k} split`);
      cases++;
    }
    if (w.length >= 3) {
      const joined = [w[0] + w[1], ...w.slice(2)].join(' ');
      assert.equal(checkAyah(ayah(k), joined).flags.length, 0, `${k} joined`);
    }
  }
  assert.ok(cases > 300);
});

test('silence flags nothing in progress, and everything once finished', () => {
  const k = keys[1];
  assert.equal(check([ayah(k)], '').flags.length, 0);
  const r = checkAyah(ayah(k), '');
  assert.deepEqual(r.flags, [{ kind: 'skipped-ayah', ayah: k }]);
});

test('live states: recited words show, the rest stay pending, a skipped word is marked', () => {
  const k = sample.find((x) => words(x).length >= 8)!;
  const w = words(k);
  const heard = [...w.slice(0, 2), ...w.slice(3, 5)].join(' '); // said words 1-2, skipped the 3rd, said 4-5, then stopped
  const r = check([ayah(k)], heard);
  assert.deepEqual(r.states.slice(0, 5), ['ok', 'ok', 'missing', 'ok', 'ok']);
  assert.ok(r.states.slice(5).every((st) => st === 'pending'));
  assert.equal(r.last, 4);
  assert.equal(r.states.length, wordCount(plain[k]));
});

test('the prompt never says "wrong"', () => {
  const k = keys[1];
  for (const f of checkAyah(ayah(k), '').flags) assert.match(prompt(f), /^تأكد من هذه/);
});

test('an alif the Mushaf writes small (dagger alif) is not a mistake: «مالك», «العالمين»', () => {
  const fatiha = ['1:1', '1:2', '1:3', '1:4'].map(ayah);
  // as the speech model writes it: full alifs where the Uthmani text has small ones
  const heard = 'بسم الله الرحمن الرحيم الحمد لله رب العالمين الرحمن الرحيم مالك يوم الدين';
  const r = check(fatiha, heard, { finished: true });
  assert.deepEqual(r.flags, []);
});

test('a vowel the model writes at a pause (و or ي after the last word) is not a slip', () => {
  for (const k of sample.slice(0, 120)) {
    const w = words(k);
    for (const v of ['ي', 'و']) {
      const heard = [...w.slice(0, -1), w[w.length - 1] + v].join(' ');
      assert.equal(checkAyah(ayah(k), heard).flags.length, 0, `${k} +${v}`);
    }
  }
});

test('one close-sounding letter is «unsure», any other difference is a slip', async () => {
  const { closeOnly } = await import('../src/recitation/match.ts');
  // letters only (no religious text): one close pair, one distant pair, two close pairs
  assert.equal(closeOnly('سمر', 'ثمر'), true);
  assert.equal(closeOnly('تمر', 'يمر'), false);
  assert.equal(closeOnly('سدر', 'ثضر'), false);
  assert.equal(closeOnly('سمر', 'سمرا'), false);
});
