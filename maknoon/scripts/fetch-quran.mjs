#!/usr/bin/env node
// Downloads the verbatim Tanzil Uthmani Quran text (CC BY 3.0, changes NOT allowed)
// and stores it unmodified as assets/content/quran-uthmani.json.
//
// By running this script you accept the Tanzil terms: https://tanzil.net/docs/text_license
// Keep the Tanzil notice (stored in the JSON as "_notice") and credit Tanzil in the app.
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'assets/content/quran-uthmani.json');
const url = 'https://tanzil.net/pub/download/index.php?quranType=uthmani&outType=txt-2&agree=true';

const res = await fetch(url);
if (!res.ok) throw new Error(`Tanzil download failed: HTTP ${res.status}`);
const raw = await res.text();

const ayat = {};
const notice = [];
for (const line of raw.split(/\r?\n/)) {
  if (line.startsWith('#')) notice.push(line.replace(/^#\s?/, ''));
  else if (line.trim()) {
    const [s, a, ...rest] = line.split('|');
    ayat[`${s}:${a}`] = rest.join('|'); // text kept byte-for-byte
  }
}
const n = Object.keys(ayat).length;
if (n !== 6236) throw new Error(`Expected 6236 ayat, got ${n} — not writing.`);

writeFileSync(out, JSON.stringify({ _source: 'tanzil.net quran-uthmani', _notice: notice.join('\n'), ayat }));
console.log(`Wrote ${n} ayat to ${out}`);
