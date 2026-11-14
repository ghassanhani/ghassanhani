import assert from 'node:assert/strict';
import { test } from 'node:test';
import { guardSummary, quoteCheck } from '../src/assistant/guard.ts';
import { readJson } from './helpers.mts';

// Real ayah text, read from the source file at run time (CLAUDE.md rule 7).
const plain = readJson<Record<string, string>>('assets/content/quran-search.json');
const quoted = quoteCheck(Object.values(plain));
const ayah = plain['2:255'].split(' ').slice(0, 8).join(' ');

test('keeps cited sentences and strips the citation marks', () => {
  const out = guardSummary('تتحدث هذه المصادر عن فضل الصبر وثوابه [1]. ويذكر المصدر الثاني جزاء الصابرين [٢].', 3, quoted);
  assert.equal(out.length, 2);
  assert.deepEqual(out[1].cites, [2]);
  assert.ok(!out[0].text.includes('['));
});

test('drops sentences without a valid source number', () => {
  const out = guardSummary('هذه جملة بلا مصدر. وهذه تشير إلى مصدر غير موجود [7]. وهذه صحيحة الإسناد إلى الأول [1].', 2, quoted);
  assert.deepEqual(out.map((l) => l.cites), [[1]]);
});

test('drops any sentence that retypes an ayah, even without quotation marks', () => {
  const out = guardSummary(`قال تعالى ${ayah} [1]. وتتحدث الآية عن عظمة الله [1].`, 1, quoted);
  assert.equal(out.length, 1);
  assert.ok(!out[0].text.includes(ayah.split(' ')[2]));
});

test('drops quotation marks and rulings, keeps the word for wisdom', () => {
  const out = guardSummary('فهذا الأمر حرام شرعًا [1]. جاء في المصدر «نص» منقول [1]. وفي ذلك حكمة ظاهرة للمتأمل [1].', 1, quoted);
  assert.equal(out.length, 1);
  assert.match(out[0].text, /حكمة/);
});

test('ignores a thinking block and keeps at most three sentences', () => {
  const s = Array.from({ length: 5 }, (_, i) => `جملة رقم ${i + 1} عن الموضوع [1].`).join(' ');
  assert.equal(guardSummary(`<think>تفكير [1].</think>${s}`, 1, quoted).length, 3);
});

test('accepts the citation styles small models drift into', () => {
  const out = guardSummary('يذكر المصدر الأول هذا المعنى (1). ويضيف الثاني جانبًا آخر [المصدر 2]. ويجمعهما معًا قول واضح [1، 2].', 2, quoted);
  assert.deepEqual(out.map((l) => l.cites), [[1], [2], [1, 2]]);
});

test('a template sentence that says nothing about the sources is dropped', () => {
  // a real ayah (read from the source file) that speaks of patience, as the cited source
  const key = Object.keys(plain).find((k) => plain[k].includes('الصبر'))!;
  const ground = { question: 'ما جزاء الصبر؟', texts: [plain[key]] };
  const out = guardSummary('يذكر المصدر الأول هذا المعنى [1]. ويضيف المصدر الثالث جانبًا آخر منه [1]. تحثّ الآية على الصبر وتجعله عونًا [1].', 1, quoted, 3, ground);
  assert.equal(out.length, 1);
  assert.match(out[0].text, /الصبر/);
});

test('a sentence that only repeats a source label is dropped', () => {
  const key = Object.keys(plain).find((k) => plain[k].includes('الصبر'))!;
  const out = guardSummary('آية · المائدة 6 [1]. آية · النساء 43 [1].', 1, quoted, 3, { question: 'مسح الجراب', texts: [plain[key]] });
  assert.equal(out.length, 0);
});
