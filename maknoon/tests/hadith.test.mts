import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { gradeLabel, graderName } from '../src/content/hadithGrades.ts';

const dir = new URL('../hosted/hadith/', import.meta.url);
const index = JSON.parse(readFileSync(new URL('../assets/content/hadith-index.json', import.meta.url), 'utf8'));
const packs = readdirSync(dir).filter((f) => f.endsWith('.json.gz'));

test('every pack is the one the index describes (size and SHA-256), with its hadith count', () => {
  assert.equal(packs.length, index.books.length);
  let total = 0;
  for (const b of index.books) {
    const gz = readFileSync(new URL(`${b.slug}.json.gz`, dir));
    assert.equal(gz.length, b.bytes, b.slug);
    assert.equal(createHash('sha256').update(gz).digest('hex'), b.sha256, b.slug);
    const p = JSON.parse(gunzipSync(gz).toString('utf8'));
    assert.equal(p.hadith.length, b.count, b.slug);
    total += p.hadith.length;
  }
  assert.equal(total, 39318);
});

test('every grading shows an Arabic label and a named grader (or «غير مسمّى»)', () => {
  const untranslated = new Map<string, number>();
  let n = 0;
  for (const b of index.books) {
    const p = JSON.parse(gunzipSync(readFileSync(new URL(`${b.slug}.json.gz`, dir))).toString('utf8'));
    for (const h of p.hadith)
      for (const g of h.g) {
        n++;
        const l = gradeLabel(g);
        if (!/[؀-ۿ]/.test(l)) untranslated.set(l, (untranslated.get(l) ?? 0) + 1);
        assert.ok(graderName(g).length > 0);
      }
  }
  const left = [...untranslated.values()].reduce((a, b) => a + b, 0);
  // labels whose meaning is not plain stay as written; they must stay rare
  assert.ok(left / n < 0.005, `untranslated ${left}/${n}: ${[...untranslated].slice(0, 12).join(' | ')}`);
});
