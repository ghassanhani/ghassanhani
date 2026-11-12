#!/usr/bin/env -S node --experimental-strip-types
// Builds the Quran search index (BM25 over roots + stems) from the KFGQPC plain-spelling text.
//   assets/content/search-quran.json
//   { keys: ["1:1", …], len: [doc lengths], avg, roots: { root: [docIdx, tf, …] }, stems: { stem: [docIdx, tf, …] },
//     forms: { root: [up to 12 most frequent surface words] } }
import { readFileSync, writeFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fold, keysOf, root } from '../src/search/arabic.ts';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const plain = JSON.parse(readFileSync(join(rootDir, 'assets/content/quran-search.json'), 'utf8')) as Record<string, string>;

const keys = Object.keys(plain);
const len: number[] = [];
const roots: Record<string, number[]> = {};
const stems: Record<string, number[]> = {};
const formCount: Record<string, Record<string, number>> = {};

keys.forEach((k, i) => {
  const raw = plain[k].split(/\s+/).filter(Boolean);
  const ws = raw.map((r) => fold(r)).filter((w) => w.length >= 2);
  len.push(ws.length);
  const rtf: Record<string, number> = {};
  const stf: Record<string, number> = {};
  raw.forEach((rw) => {
    const w = fold(rw);
    if (w.length < 2) return;
    const r = root(w); // primary root: groups the surface forms shown on the root card
    const k = keysOf(w); // every reading of the word is searchable
    for (const x of k.roots) rtf[x] = (rtf[x] ?? 0) + 1;
    for (const x of k.stems) stf[x] = (stf[x] ?? 0) + 1;
    (formCount[r] ??= {})[rw] = ((formCount[r] ??= {})[rw] ?? 0) + 1; // original spelling for display
  });
  for (const [r, tf] of Object.entries(rtf)) (roots[r] ??= []).push(i, tf);
  for (const [st, tf] of Object.entries(stf)) (stems[st] ??= []).push(i, tf);
});

const forms: Record<string, string[]> = {};
for (const [r, m] of Object.entries(formCount)) {
  forms[r] = Object.entries(m)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([w]) => w);
}
const avg = len.reduce((a, b) => a + b, 0) / len.length;
writeFileSync(join(rootDir, 'assets/content/search-quran.json'), JSON.stringify({ keys, len, avg, roots, stems, forms }));
console.log(`Search index: ${keys.length} ayat, ${Object.keys(roots).length} roots, ${Object.keys(stems).length} stems`);

// ── al-Mukhtasar (bundled pack) — same BM25 layout, used by the native assistant/search ──
{
  const db = new DatabaseSync(join(rootDir, 'assets/packs/tafsir-almokhtassar.db'), { readOnly: true });
  const rows = db.prepare('SELECT surah, ayah, text FROM tafsir ORDER BY surah, ayah').all() as { surah: number; ayah: number; text: string }[];
  const tkeys: string[] = [];
  const tlen: number[] = [];
  const troots: Record<string, number[]> = {};
  const tstems: Record<string, number[]> = {};
  rows.forEach((r, i) => {
    tkeys.push(`${r.surah}:${r.ayah}`);
    const ws = fold(r.text).split(' ').filter((w) => w.length >= 2);
    tlen.push(ws.length);
    const rtf: Record<string, number> = {};
    const stf: Record<string, number> = {};
    for (const w of ws) {
      const k = keysOf(w);
      for (const x of k.roots) rtf[x] = (rtf[x] ?? 0) + 1;
      for (const x of k.stems) stf[x] = (stf[x] ?? 0) + 1;
    }
    for (const [k, tf] of Object.entries(rtf)) (troots[k] ??= []).push(i, tf);
    for (const [k, tf] of Object.entries(stf)) (tstems[k] ??= []).push(i, tf);
  });
  const tavg = tlen.reduce((a, b) => a + b, 0) / tlen.length;
  writeFileSync(join(rootDir, 'assets/content/search-mukhtasar.json'), JSON.stringify({ keys: tkeys, len: tlen, avg: tavg, roots: troots, stems: tstems, forms: {} }));
  console.log(`Tafsir index (al-Mukhtasar): ${tkeys.length} entries, ${Object.keys(troots).length} roots`);
}
