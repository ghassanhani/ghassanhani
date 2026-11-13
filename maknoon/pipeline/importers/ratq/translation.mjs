#!/usr/bin/env node
// Translation importer (RATQ): the French translation of the meanings by Rachid Maach
// (IslamHouse, via QuranEnc), RATQ cms-10, CC BY-ND. SPEC §4: cleared, verbatim with attribution.
//
//   node pipeline/importers/ratq/translation.mjs      reads assets/itqan/french-translation/*.csv
//
// Verification before anything is written:
//   · one row per ayah: 6,236 rows whose (sura, aya) are exactly the Quran's ayah keys, in order
//   · ids run 1..6236
//   · every stored text and footnote is byte-identical to the source cell
//   · the publisher's notice block is kept with the data (the file asks for it not to be removed)
import { createHash } from 'node:crypto';
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findFile } from '../../../scripts/lib.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const LANGS = {
  fr: { slug: 'french-translation', ratq: 'cms-10', name: 'Rachid Maach (IslamHouse, QuranEnc)' },
};

/** RFC 4180 rows as arrays of cells (quotes removed, "" → "). */
function rows(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const out = [];
  let row = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      out.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    out.push(row);
  }
  return out;
}

const hafs = JSON.parse(readFileSync(join(root, 'assets/content/quran-hafs.json'), 'utf8')).ayat;
const keys = Object.keys(hafs);
const catalog = JSON.parse(readFileSync(join(root, 'assets/content/ratq-catalog.json'), 'utf8')).resources;

for (const [lang, meta] of Object.entries(LANGS)) {
  const file = findFile(join(root, 'assets/itqan', meta.slug), /\.csv$/i);
  if (!file) throw new Error(`${meta.slug}: CSV missing — run npm run itqan:pull`);
  const raw = readFileSync(file, 'utf8');
  const all = rows(raw);
  const h = all.findIndex((r) => r.join(',') === 'id,sura,aya,translation,footnotes');
  if (h < 0) throw new Error(`${meta.slug}: header not found`);
  const notice = all
    .slice(0, h)
    .map((r) => r[0])
    .join('\n')
    .trim();
  const data = all.slice(h + 1).filter((r) => r.length > 1);

  const fail = [];
  if (data.length !== keys.length) fail.push(`${data.length} rows, expected ${keys.length}`);
  const ayat = {};
  const notes = {};
  data.forEach((r, i) => {
    const [id, sura, aya, text, foot] = r;
    const key = `${sura}:${aya}`;
    if (Number(id) !== i + 1) fail.push(`row ${i + 1}: id ${id}`);
    if (key !== keys[i]) fail.push(`row ${i + 1}: ${key}, expected ${keys[i]}`);
    if (!text) fail.push(`${key}: empty text`);
    ayat[key] = text;
    if (foot) notes[key] = foot;
  });
  // Byte check: every stored cell appears verbatim in the source (quoted cells re-escaped).
  const esc = (s) => s.replace(/"/g, '""');
  for (const [k, t] of Object.entries(ayat)) if (!raw.includes(`"${esc(t)}"`) && !raw.includes(`,${t},`)) fail.push(`${k}: text not found verbatim`);
  for (const [k, t] of Object.entries(notes)) if (!raw.includes(`"${esc(t)}"`)) fail.push(`${k}: footnote not found verbatim`);
  if (fail.length) {
    console.error(`${meta.slug}: verification FAILED (${fail.length}); nothing written.\n  ` + fail.slice(0, 15).join('\n  '));
    process.exit(1);
  }

  const r = catalog.find((x) => x.slug === meta.ratq);
  const out = join(root, `assets/content/translation-${lang}.json`);
  const json = {
    _source: `${r?.name_ar ?? meta.slug} · ${meta.name} · via RATQ (${meta.ratq})`,
    _license: r?.license ?? 'CC-BY-ND',
    _source_id: meta.ratq,
    _edition_id: meta.slug,
    _notice: notice,
    _verify: { rows: data.length, footnotes: Object.keys(notes).length, sourceSha256: createHash('sha256').update(raw).digest('hex') },
    ayat,
    notes,
  };
  writeFileSync(`${out}.tmp`, JSON.stringify(json));
  renameSync(`${out}.tmp`, out);
  console.log(`${meta.slug}: verified and written — ${data.length} ayat, ${Object.keys(notes).length} with footnotes.`);
}
