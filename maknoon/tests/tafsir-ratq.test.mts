// The four tafsirs read straight from the RATQ files: the byte indexes the app ships, and the
// same read the phone does (decode UTF-8 from a byte range, unescape CSV quotes).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { utf8 } from '../src/content/utf8.ts';

const manifest = JSON.parse(readFileSync(new URL('../assets/packs/manifest.json', import.meta.url), 'utf8'));
const csvPacks = manifest.packs.filter((p: { csv?: unknown }) => p.csv);

test('tafsir-ratq: the four downloadable tafsirs point at RATQ storage with a checksum', () => {
  assert.equal(csvPacks.length, 4);
  for (const p of csvPacks) {
    assert.match(p.csv.url, /^https:\/\/storage\.cms\.itqan\.dev\//, p.slug);
    assert.match(p.csv.sha256, /^[0-9a-f]{64}$/, p.slug);
    const idx = JSON.parse(readFileSync(new URL(`../assets/packs/${p.slug}.idx.json`, import.meta.url), 'utf8'));
    assert.equal(idx.sha256, p.csv.sha256);
    assert.equal(idx.rows.length, 6236 * 10, p.slug);
  }
});

test('tafsir-ratq: utf8() decodes like the platform decoder', () => {
  const s = 'بِسۡمِ ٱللَّهِ ﴿١﴾ « Allah » — 𝒜 ✓';
  assert.equal(utf8(new Uint8Array(Buffer.from(s, 'utf8'))), s);
});

// Full read-back against the verified packs, when the RATQ files and packs are on this machine.
for (const p of csvPacks) {
  const dir = new URL(`../assets/itqan/${p.slug}/`, import.meta.url);
  const db = new URL(`../assets/packs/${p.slug}.db`, import.meta.url);
  const have = existsSync(dir) && existsSync(db);
  test(`tafsir-ratq: ${p.slug} — every passage read by byte range equals the pack`, { skip: !have && 'RATQ file or pack not present' }, () => {
    const file = readdirSync(dir).find((f) => f.endsWith('.csv'))!;
    const buf = readFileSync(new URL(file, dir));
    const idx = JSON.parse(readFileSync(new URL(`../assets/packs/${p.slug}.idx.json`, import.meta.url), 'utf8'));
    const rows = new DatabaseSync(db.pathname, { readOnly: true }).prepare('SELECT surah, ayah, text, footnote FROM tafsir').all() as { surah: number; ayah: number; text: string; footnote: string | null }[];
    const at = new Map<string, number>();
    for (let i = 0; i < idx.rows.length; i += 10) at.set(`${idx.rows[i]}:${idx.rows[i + 1]}`, i);
    const cell = (s: number, l: number, q: number) => (l ? (q ? utf8(new Uint8Array(buf.subarray(s, s + l))).replace(/""/g, '"') : utf8(new Uint8Array(buf.subarray(s, s + l)))) : null);
    for (const r of rows) {
      const i = at.get(`${r.surah}:${r.ayah}`)!;
      const x = idx.rows;
      assert.equal(cell(x[i + 2], x[i + 3], x[i + 4]), r.text, `${r.surah}:${r.ayah}`);
      assert.equal(cell(x[i + 5], x[i + 6], x[i + 7]), r.footnote ?? null, `${r.surah}:${r.ayah} footnote`);
    }
  });
}
