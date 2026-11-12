// One test per rule of the shared normalizer (SPEC §5). Sample words are ordinary
// vocabulary typed with code points, not scripture (CLAUDE.md rule 7).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fold, normalize, root, stem } from '../src/search/arabic.ts';

test('strips tashkeel', () => {
  assert.equal(normalize('مَدْرَسَةٌ'), 'مدرسه');
  assert.equal(normalize('كِتَابًا'), 'كتابا');
  assert.equal(normalize('مُعَلِّمٍ'), 'معلم');
});
test('strips tatweel', () => assert.equal(normalize('كتـــاب'), 'كتاب'));
test('strips Quranic annotation marks and the dagger alef', () => {
  // U+06D6–U+06ED (stop signs, small letters), U+0670 (dagger alef), U+08F0–U+08FF
  assert.equal(normalize('كتابۖ قلمۚ ۩'), 'كتاب قلم');
  assert.equal(normalize('كٰتب'), 'كتب');
  assert.equal(normalize('كتبࣰ'), 'كتب');
});
test('أ إ آ ٱ → ا', () => {
  assert.equal(normalize('أحمد إبراهيم آدم ٱسم'), 'احمد ابراهيم ادم اسم');
});
test('ى → ي', () => assert.equal(normalize('مستشفى'), 'مستشفي'));
test('ة → ه', () => assert.equal(normalize('مدينة'), 'مدينه'));
test('ؤ → و', () => assert.equal(normalize('مسؤول'), 'مسوول'));
test('ئ → ي', () => assert.equal(normalize('مسائل'), 'مسايل'));
test('collapses whitespace', () => assert.equal(normalize('  كتاب \n\t قلم  '), 'كتاب قلم'));
test('strips punctuation, digits and Latin', () => {
  assert.equal(normalize('كتاب، قلم! (ورق) ٣ 12 abc؟'), 'كتاب قلم ورق');
});
test('is idempotent and never returns marks', () => {
  const s = normalize('أَلْمَدْرَسَةُ ٱلْكَبِيرَةُ، مُؤَسَّسَةٌ!');
  assert.equal(normalize(s), s);
  assert.doesNotMatch(s, /[ً-ٰٟـ]/);
});

test('fold = normalize + every hamza seat as alef (search keys only)', () => {
  assert.equal(fold('سأل'), fold('سئل'));
  assert.equal(fold('سؤال'), 'ساال');
  assert.equal(fold('مَدْرَسَةٌ'), normalize('مَدْرَسَةٌ')); // no hamza → identical to the spec normalizer
});

test('stems and roots group common derivatives', () => {
  for (const [w, r] of [
    ['الكاتبون', 'كتب'],
    ['مكتوب', 'كتب'],
    ['يكتبون', 'كتب'],
    ['كبير', 'كبر'],
    ['استغفر', 'غفر'],
    ['المعلمين', 'علم'],
  ] as const)
    assert.equal(root(fold(w)), r, w);
  assert.equal(stem(fold('والكتاب')), 'كتاب');
  assert.equal(stem(fold('وعد')), 'وعد'); // one-letter prefix kept when the word would shrink below 4 letters
});
