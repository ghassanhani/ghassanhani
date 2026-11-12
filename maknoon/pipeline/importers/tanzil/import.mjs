#!/usr/bin/env node
// Tanzil importer (SPEC §4, M1): raw → cleaned → canonical IDs → verification → load.
// Deterministic and re-runnable: the same raw file always produces the same bytes.
//
//   node pipeline/importers/tanzil/import.mjs             import pipeline/raw/tanzil/quran-uthmani.txt
//   node pipeline/importers/tanzil/import.mjs --download  fetch the raw file from tanzil.net first
//
// --download accepts the Tanzil terms (https://tanzil.net/docs/text_license) on your behalf,
// so only the founder runs it. The text is CC BY 3.0, verbatim: no change is ever made to it.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHafs } from 'quran-meta';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const rawFile = join(root, 'pipeline/raw/tanzil/quran-uthmani.txt');
const out = join(root, 'assets/content/quran-uthmani.json');
const sha = (s) => createHash('sha256').update(s).digest('hex');

// 1 · raw
if (process.argv.includes('--download')) {
  const res = await fetch('https://tanzil.net/pub/download/index.php?quranType=uthmani&outType=txt-2&agree=true');
  if (!res.ok) throw new Error(`Tanzil download failed: HTTP ${res.status}`);
  mkdirSync(dirname(rawFile), { recursive: true });
  writeFileSync(rawFile, Buffer.from(await res.arrayBuffer()));
}
if (!existsSync(rawFile)) {
  console.error(`No raw file at ${rawFile}.\nRun: npm run fetch:quran   (downloads from tanzil.net and accepts its licence terms)`);
  process.exit(1);
}
const raw = readFileSync(rawFile, 'utf8');

// 2 · cleaned (structure only: lines are split, text is kept byte-for-byte) → 3 · canonical IDs
const ayat = {};
const notice = [];
const sourceLines = [];
for (const line of raw.split(/\r?\n/)) {
  if (line.startsWith('#')) notice.push(line.replace(/^#\s?/, ''));
  else if (line.trim()) {
    const [s, a, ...rest] = line.split('|');
    ayat[`${s}:${a}`] = rest.join('|');
    sourceLines.push(line);
  }
}

// 4 · verification — a failed check writes nothing (the previous file stays as it was)
const keys = Object.keys(ayat);
const fail = (m) => {
  console.error(`VERIFICATION FAILED: ${m} — nothing written.`);
  process.exit(1);
};
if (keys.length !== 6236) fail(`expected 6236 ayat, got ${keys.length}`);
const qm = createHafs();
const surahs = new Set(keys.map((k) => k.split(':')[0]));
if (surahs.size !== 114) fail(`expected 114 surahs, got ${surahs.size}`);
for (let s = 1; s <= 114; s++) {
  const n = keys.filter((k) => k.startsWith(`${s}:`)).length;
  if (n !== qm.getSurahMeta(s).ayahCount) fail(`surah ${s}: ${n} ayat, expected ${qm.getSurahMeta(s).ayahCount}`);
}
const sourceHash = sha(sourceLines.join('\n'));
const storedHash = sha(keys.map((k) => `${k.replace(':', '|')}|${ayat[k]}`).join('\n'));
if (storedHash !== sourceHash) fail('stored text does not hash-match the source file');

// 5 · load (atomic: write a temp file, then rename)
const body = JSON.stringify({
  _source: 'tanzil.net quran-uthmani',
  _source_id: 'tanzil',
  _edition_id: 'tanzil-uthmani',
  _license_id: 'cc-by-3.0',
  _notice: notice.join('\n'),
  _verify: { surahs: 114, ayat: 6236, sha256: storedHash, raw_sha256: sha(raw) },
  ayat,
});
const unchanged = existsSync(out) && readFileSync(out, 'utf8') === body;
if (!unchanged) {
  writeFileSync(`${out}.tmp`, body);
  renameSync(`${out}.tmp`, out);
}
console.log(`Tanzil: 114 surahs, 6236 ayat, sha256 ${storedHash.slice(0, 16)}… — ${unchanged ? 'no change' : 'written'}`);
