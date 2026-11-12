#!/usr/bin/env node
// RATQ tafsir importer (SPEC §4, M3): raw → cleaned → canonical IDs → verification → load.
// Builds one SQLite "content pack" per tafsir from the raw Itqan downloads
// (assets/itqan/, see `npm run itqan:pull`). Deterministic and re-runnable.
//
// Verification (a pack that fails is deleted and the run stops):
//   · every passage maps to an existing ayah ID (surah:ayah within the 6,236)
//   · every stored body and footnote is byte-identical to the source row
// Per-tafsir ayah coverage is printed at the end.
//
//  assets/packs/<slug>.db      table tafsir(surah, ayah, edition, stage, text, footnote)
//  assets/packs/manifest.json  slug, title, licence, attribution, bytes, sha256, rows, bundled
//
// Text is stored byte-for-byte (CC BY-ND). Rows the publisher marks «قابل للنشر = لا» are skipped.
// The bundled pack (al-Mukhtasar) ships inside the app; the others are downloaded from
// expo.extra.packsBaseUrl in app.json, where you host the .db files (e.g. GitHub Releases).
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findFile, parseCsv } from '../../../scripts/lib.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const raw = join(root, 'assets/itqan');
const out = join(root, 'assets/packs');
mkdirSync(out, { recursive: true });

const catalog = JSON.parse(readFileSync(join(root, 'assets/content/ratq-catalog.json'), 'utf8')).resources;
// registry slug → Ratq slug (licence + publisher come from Ratq, never hand-typed)
const PACKS = [
  { slug: 'tafsir-almokhtassar', ratq: 'cms-8', bundled: true },
  { slug: 'tafsir-alsaadi', ratq: 'cms-6' },
  { slug: 'tafsir-ibn-katheer', ratq: 'cms-5' },
  { slug: 'tafsir-albaghawi', ratq: 'cms-7' },
  { slug: 'tafsir-altabari', ratq: 'cms-4' },
];

const index = JSON.parse(readFileSync(join(root, 'assets/content/quran-index.json'), 'utf8')).surahs;
const ayahCount = new Map(index.map((x) => [x.n, x.ayat]));
const TOTAL_AYAT = 6236;
const coverage = [];

const manifest = [];
for (const p of PACKS) {
  const r = catalog.find((x) => x.slug === p.ratq);
  const csv = findFile(join(raw, p.slug), /\.csv$/i);
  if (!csv) throw new Error(`${p.slug}: CSV missing — run npm run itqan:pull`);
  const rows = parseCsv(readFileSync(csv, 'utf8'));

  const file = join(out, `${p.slug}.db`);
  rmSync(file, { force: true });
  const db = new DatabaseSync(file);
  db.exec(`CREATE TABLE tafsir (surah INTEGER NOT NULL, ayah INTEGER NOT NULL, edition TEXT, stage TEXT, text TEXT NOT NULL, footnote TEXT, PRIMARY KEY (surah, ayah)) WITHOUT ROWID;
           CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);`);
  const ins = db.prepare('INSERT INTO tafsir VALUES (?, ?, ?, ?, ?, ?)');
  let n = 0;
  const source = new Map(); // "s:a" → [text, footnote] exactly as in the source file
  const orphans = [];
  db.exec('BEGIN');
  for (const row of rows) {
    if ((row['قابل للنشر'] ?? 'نعم') !== 'نعم') continue;
    const text = row['text'] ?? row['المحتوى'];
    if (!text) continue;
    const su = Number(row['surah'] ?? row['رقم السورة']);
    const ay = Number(row['ayah'] ?? row['رقم الآية']);
    if (!(ay >= 1 && ay <= (ayahCount.get(su) ?? 0))) orphans.push(`${su}:${ay}`);
    ins.run(su, ay, row['المشروع'] || null, row['مرحلة العمل'] || null, text, row['الهامش'] || null);
    source.set(`${su}:${ay}`, [text, row['الهامش'] || null]);
    n++;
  }
  const meta = db.prepare('INSERT INTO meta VALUES (?, ?)');
  meta.run('source', `Itqan registry · ${p.slug}`);
  meta.run('license', r.license);
  meta.run('publisher', r.publisher?.name_ar ?? '');
  db.exec('COMMIT');
  db.exec('VACUUM');

  // ── verification ──
  let mismatch = 0;
  const stored = db.prepare('SELECT surah, ayah, text, footnote FROM tafsir').all();
  for (const r of stored) {
    const src = source.get(`${r.surah}:${r.ayah}`);
    if (!src || !Buffer.from(src[0]).equals(Buffer.from(r.text)) || (src[1] ?? null) !== (r.footnote ?? null)) mismatch++;
  }
  db.close();
  if (orphans.length || mismatch || stored.length !== source.size) {
    rmSync(file, { force: true }); // roll back
    throw new Error(`${p.slug}: VERIFICATION FAILED — ${orphans.length} passage(s) without an ayah ID (${orphans.slice(0, 5).join(', ')}), ${mismatch} body mismatch(es). Pack deleted.`);
  }
  coverage.push({ slug: p.slug, title: r.name_ar, ayat: stored.length });

  const bytes = statSync(file).size;
  const sha256 = createHash('sha256').update(readFileSync(file)).digest('hex');
  manifest.push({ slug: p.slug, ratq: p.ratq, title: r.name_ar, license: r.license, publisher: r.publisher?.name_ar ?? null, rows: n, bytes, sha256, bundled: !!p.bundled, version: 1 });
  console.log(`${p.slug}: ${n} rows, ${(bytes / 1e6).toFixed(1)} MB${p.bundled ? ' (bundled)' : ''}`);
}
console.log('\nVerified: every passage has an ayah ID; bodies byte-identical to source.\nAyah coverage:');
for (const c of coverage) console.log(`  ${c.title.padEnd(34)} ${c.ayat}/${TOTAL_AYAT} = ${((c.ayat / TOTAL_AYAT) * 100).toFixed(1)}%`);
writeFileSync(join(out, 'coverage.json'), JSON.stringify({ total_ayat: TOTAL_AYAT, tafsir: coverage }, null, 1) + '\n');
writeFileSync(join(out, 'manifest.json'), JSON.stringify({ format: 1, packs: manifest }, null, 1) + '\n');
