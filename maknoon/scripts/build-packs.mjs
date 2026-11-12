#!/usr/bin/env node
// Builds one SQLite "content pack" per tafsir from the raw Itqan downloads
// (assets/itqan/, see `npm run itqan:pull`) — plan §7.4 offline packs.
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
import { findFile, parseCsv } from './lib.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
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
  db.exec('BEGIN');
  for (const row of rows) {
    if ((row['قابل للنشر'] ?? 'نعم') !== 'نعم') continue;
    const text = row['text'] ?? row['المحتوى'];
    if (!text) continue;
    ins.run(Number(row['surah'] ?? row['رقم السورة']), Number(row['ayah'] ?? row['رقم الآية']), row['المشروع'] || null, row['مرحلة العمل'] || null, text, row['الهامش'] || null);
    n++;
  }
  const meta = db.prepare('INSERT INTO meta VALUES (?, ?)');
  meta.run('source', `Itqan registry · ${p.slug}`);
  meta.run('license', r.license);
  meta.run('publisher', r.publisher?.name_ar ?? '');
  db.exec('COMMIT');
  db.exec('VACUUM');
  db.close();

  const bytes = statSync(file).size;
  const sha256 = createHash('sha256').update(readFileSync(file)).digest('hex');
  manifest.push({ slug: p.slug, ratq: p.ratq, title: r.name_ar, license: r.license, publisher: r.publisher?.name_ar ?? null, rows: n, bytes, sha256, bundled: !!p.bundled, version: 1 });
  console.log(`${p.slug}: ${n} rows, ${(bytes / 1e6).toFixed(1)} MB${p.bundled ? ' (bundled)' : ''}`);
}
writeFileSync(join(out, 'manifest.json'), JSON.stringify({ format: 1, packs: manifest }, null, 1) + '\n');
