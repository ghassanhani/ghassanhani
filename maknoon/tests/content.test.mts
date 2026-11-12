// CLAUDE.md hard rules 1–3: bundled sacred text is exactly what the importer verified.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { ROOT, readJson } from './helpers.mts';

type Quran = { _source_id?: string; _license_id?: string; _verify?: { surahs: number; ayat: number; sha256: string }; ayat: Record<string, string> };
const sha = (s: string | Buffer) => createHash('sha256').update(s).digest('hex');
const lines = (q: Quran) => Object.keys(q.ayat).map((k) => `${k.replace(':', '|')}|${q.ayat[k]}`).join('\n');

for (const file of ['quran-hafs.json', 'quran-uthmani.json']) {
  test(`${file}: 114 surahs, 6,236 ayat, text hash-matches its source`, (t) => {
    const q = readJson<Quran>(`assets/content/${file}`);
    const keys = Object.keys(q.ayat);
    if (!keys.length) return t.skip('not imported yet');
    assert.equal(keys.length, 6236);
    assert.equal(new Set(keys.map((k) => k.split(':')[0])).size, 114);
    assert.ok(q._source_id && q._license_id, 'carries source and licence IDs');
    assert.equal(sha(lines(q)), q._verify?.sha256, 'stored text was changed after import');
  });
}

test('search text and index cover the same 6,236 ayat as the canonical text', () => {
  const canon = Object.keys(readJson<Quran>('assets/content/quran-hafs.json').ayat);
  const plain = Object.keys(readJson<Record<string, string>>('assets/content/quran-search.json'));
  const idx = readJson<{ keys: string[] }>('assets/content/search-quran.json').keys;
  const emb = readJson<{ keys: string[]; count: number }>('assets/content/embeddings-ayat.json');
  assert.deepEqual(plain, canon);
  assert.deepEqual(idx, canon);
  assert.deepEqual(emb.keys, canon);
  assert.equal(emb.count, 6236);
});

test('bundled tafsir pack matches its manifest hash and licence record', () => {
  const m = readJson<{ packs: { slug: string; sha256: string; bytes: number; bundled: boolean; license: string; rows: number }[] }>('assets/packs/manifest.json');
  assert.equal(m.packs.length, 5, 'five tafsirs (SPEC §2.2)');
  for (const p of m.packs) {
    assert.ok(p.license, `${p.slug} has a licence`);
    assert.equal(p.rows, 6236, `${p.slug} covers every ayah`);
    if (!p.bundled) continue;
    const buf = readFileSync(join(ROOT, `assets/packs/${p.slug}.db`));
    assert.equal(buf.length, p.bytes);
    assert.equal(sha(buf), p.sha256);
  }
});
