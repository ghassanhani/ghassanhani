#!/usr/bin/env node
// Tafsir byte index: lets the app read the four downloadable tafsirs straight from the RATQ files
// (no hosting of our own). For each passage it records where its text, footnote, edition and stage
// sit inside the original CSV, so the phone downloads that exact file from RATQ, checks its SHA-256
// and reads each passage in place.
//
//   node pipeline/importers/ratq/tafsir-index.mjs      after npm run itqan:pull and npm run packs:build
//
// Verification before anything is written, per tafsir:
//   · the CSV is the file RATQ serves now (same SHA-256 as a fresh download's size and hash)
//   · reading every passage back through its byte ranges gives exactly the row of the verified
//     pack (assets/packs/<slug>.db, itself checked byte for byte against the same CSV)
//   · one entry per pack row, no more, no less
import { createHash } from 'node:crypto';
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { findFile } from '../../../scripts/lib.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const REGISTRY = process.env.ITQAN_REGISTRY_URL ?? 'https://api.cms.itqan.dev';
const manifestFile = join(root, 'assets/packs/manifest.json');
const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
const yaml = readFileSync(join(root, 'itqan-assets.yaml'), 'utf8');
const versionOf = (slug) => yaml.match(new RegExp(`\\n  ${slug}:\\s*\\n    version:\\s*"([^"]+)"`))?.[1];

const targets = manifest.packs.filter((p) => !p.bundled);
const res = await fetch(`${REGISTRY}/packages/resolve/manifest/`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify({ assets: Object.fromEntries(targets.map((p) => [p.slug, versionOf(p.slug)])) }),
});
if (!res.ok) throw new Error(`Registry ${res.status}: ${await res.text()}`);
const resolved = new Map((await res.json()).results.map((r) => [r.slug, r]));

/** CSV rows as arrays of cells, each cell its byte range [start, end) inside quotes and whether it was quoted. */
function scan(buf) {
  const rows = [];
  let row = [];
  let i = buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf ? 3 : 0;
  while (i <= buf.length) {
    if (i === buf.length) {
      if (row.length) rows.push(row);
      break;
    }
    let cell;
    if (buf[i] === 0x22) {
      const start = ++i;
      for (;;) {
        if (buf[i] === 0x22 && buf[i + 1] === 0x22) i += 2;
        else if (buf[i] === 0x22) break;
        else i++;
      }
      cell = { s: start, e: i, q: 1 };
      i++;
    } else {
      const start = i;
      while (i < buf.length && buf[i] !== 0x2c && buf[i] !== 0x0a && buf[i] !== 0x0d) i++;
      cell = { s: start, e: i, q: 0 };
    }
    row.push(cell);
    if (buf[i] === 0x2c) i++;
    else {
      if (buf[i] === 0x0d) i++;
      if (buf[i] === 0x0a) i++;
      rows.push(row);
      row = [];
    }
  }
  return rows;
}
const read = (buf, c) => {
  const t = buf.subarray(c.s, c.e).toString('utf8');
  return c.q ? t.replace(/""/g, '"') : t;
};

for (const p of targets) {
  const csvPath = findFile(join(root, 'assets/itqan', p.slug), /\.csv$/i);
  if (!csvPath) throw new Error(`${p.slug}: CSV missing — run npm run itqan:pull`);
  const buf = readFileSync(csvPath);
  const sha256 = createHash('sha256').update(buf).digest('hex');
  const r = resolved.get(p.slug);
  if (!r?.download_url) throw new Error(`${p.slug}: no download URL from RATQ`);

  const rows = scan(buf);
  const head = rows[0].map((c) => read(buf, c));
  const col = (...names) => names.map((n) => head.indexOf(n)).find((i) => i >= 0) ?? -1;
  const C = { text: col('text', 'المحتوى'), surah: col('surah', 'رقم السورة'), ayah: col('ayah', 'رقم الآية'), pub: col('قابل للنشر'), ed: col('المشروع'), st: col('مرحلة العمل'), fn: col('الهامش') };

  const editions = [];
  const stages = [];
  const idOf = (list, v) => (v ? (list.includes(v) ? list.indexOf(v) : list.push(v) - 1) : -1);
  const flat = [];
  const got = new Map();
  for (const row of rows.slice(1)) {
    const cell = (i) => (i >= 0 && row[i] ? read(buf, row[i]) : '');
    if ((C.pub >= 0 ? cell(C.pub) : 'نعم') !== 'نعم') continue;
    const text = cell(C.text);
    if (!text) continue;
    const su = Number(cell(C.surah));
    const ay = Number(cell(C.ayah));
    const t = row[C.text];
    const f = C.fn >= 0 && row[C.fn] && row[C.fn].e > row[C.fn].s ? row[C.fn] : null;
    flat.push(su, ay, t.s, t.e - t.s, t.q, f ? f.s : 0, f ? f.e - f.s : 0, f ? f.q : 0, idOf(editions, cell(C.ed)), idOf(stages, cell(C.st)));
    got.set(`${su}:${ay}`, { edition: cell(C.ed) || null, stage: cell(C.st) || null, text, footnote: cell(C.fn) || null });
  }

  // ── verification against the verified pack
  const db = new DatabaseSync(join(root, 'assets/packs', `${p.slug}.db`), { readOnly: true });
  const packRows = db.prepare('SELECT surah, ayah, edition, stage, text, footnote FROM tafsir').all();
  db.close();
  let bad = 0;
  for (const x of packRows) {
    const g = got.get(`${x.surah}:${x.ayah}`);
    if (!g || g.text !== x.text || g.footnote !== (x.footnote ?? null) || g.edition !== (x.edition ?? null) || g.stage !== (x.stage ?? null)) bad++;
  }
  if (bad || packRows.length !== got.size || got.size !== flat.length / 10) {
    console.error(`${p.slug}: verification FAILED — ${bad} mismatch(es), ${got.size} index rows vs ${packRows.length} pack rows. Nothing written.`);
    process.exit(1);
  }

  const out = join(root, 'assets/packs', `${p.slug}.idx.json`);
  writeFileSync(`${out}.tmp`, JSON.stringify({ format: 1, url: r.download_url, version: r.resolved_version, bytes: buf.length, sha256, editions, stages, fields: 'surah,ayah,textStart,textLength,textQuoted,noteStart,noteLength,noteQuoted,edition,stage', rows: flat }));
  renameSync(`${out}.tmp`, out);
  Object.assign(p, { csv: { url: r.download_url, version: r.resolved_version, bytes: buf.length, sha256 } });
  console.log(`${p.slug}: ${got.size} passages indexed and read back identical to the pack · ${(buf.length / 1e6).toFixed(1)} MB from RATQ`);
}
writeFileSync(manifestFile, JSON.stringify(manifest, null, 1) + '\n');
