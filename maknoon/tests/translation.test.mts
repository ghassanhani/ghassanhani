// The bundled French translation (RATQ cms-10): one verbatim entry per ayah, keyed like the Quran text.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const tr = JSON.parse(readFileSync(new URL('../assets/content/translation-fr.json', import.meta.url), 'utf8'));
const hafs = JSON.parse(readFileSync(new URL('../assets/content/quran-hafs.json', import.meta.url), 'utf8')).ayat;

test('translation-fr: every ayah, same keys and order as the Quran text', () => {
  assert.deepEqual(Object.keys(tr.ayat), Object.keys(hafs));
  for (const [k, t] of Object.entries(tr.ayat)) assert.ok((t as string).length > 0, k);
});

test('translation-fr: carries its source, licence and the publisher notice', () => {
  assert.match(tr._source, /cms-10/);
  assert.equal(tr._license, 'CC-BY-ND');
  assert.match(tr._notice, /DON'T REMOVE/);
});

const en = JSON.parse(readFileSync(new URL('../assets/content/translation-en.json', import.meta.url), 'utf8'));
test('translation-en: every ayah, same keys and order as the Quran text, from RATQ cms-9', () => {
  assert.deepEqual(Object.keys(en.ayat), Object.keys(hafs));
  assert.match(en._source, /cms-9/);
  assert.equal(en._license, 'CC-BY-ND');
});
