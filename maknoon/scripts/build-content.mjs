#!/usr/bin/env node
// Builds the app's bundled content from the raw Itqan downloads (assets/itqan/).
// Text is copied byte-for-byte: no edits, no trimming inside a field (ND licences).
//
//  - assets/content/quran-hafs.json   KFGQPC Hafs text + page/juz (CC BY-NC-ND)
//  - assets/fonts/kfgqpc/…ttf         the matching KFGQPC Uthmanic Hafs font
//  - assets/content/tafsir-sample.json the five tafsirs for the ayat the UI shows today
//    (full per-ayah packs ship later as downloadable SQLite packs — plan §7.4)
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const raw = join(root, 'assets/itqan');
const out = join(root, 'assets/content');

// Ayat whose tafsir the current screens display.
const SAMPLE_AYAT = ['3:3'];

function findFile(dir, re) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      const f = findFile(p, re);
      if (f) return f;
    } else if (re.test(e.name)) return p;
  }
  return null;
}

/** RFC 4180 CSV (quoted fields may contain commas, quotes and newlines). */
function parseCsv(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows = [];
  let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else q = false;
      } else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [header, ...body] = rows;
  return body.filter((r) => r.length > 1).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

// ── Quran (KFGQPC Hafs) ───────────────────────────────────────────────
const hafsJson = findFile(join(raw, 'unicode-uthmanic-font-hafs-narration'), /^hafsData_v[\d-]+\.json$/);
const hafs = JSON.parse(readFileSync(hafsJson, 'utf8').replace(/^﻿/, ''));
const ayat = {}, pos = {}, surahs = {};
for (const a of hafs) {
  const k = `${a.sura_no}:${a.aya_no}`;
  ayat[k] = a.aya_text; // verbatim, includes the KFGQPC ayah-mark glyph
  pos[k] = [a.page, a.jozz];
  surahs[a.sura_no] = a.sura_name_ar;
}
if (Object.keys(ayat).length !== 6236) throw new Error('Unexpected ayah count in KFGQPC data');
writeFileSync(
  join(out, 'quran-hafs.json'),
  JSON.stringify({
    _source: 'KFGQPC Uthmanic Hafs Data v2.0 via Itqan (unicode-uthmanic-font-hafs-narration)',
    _license: 'CC BY-NC-ND 4.0 — King Fahd Glorious Qur\'an Printing Complex',
    surahs, ayat, pos,
  }),
);
const ttf = findFile(join(raw, 'unicode-uthmanic-font-hafs-narration'), /\.ttf$/i);
mkdirSync(join(root, 'assets/fonts/kfgqpc'), { recursive: true });
copyFileSync(ttf, join(root, 'assets/fonts/kfgqpc/UthmanicHafs.ttf'));
console.log('Quran: 6236 ayat + KFGQPC Uthmanic Hafs font');

// ── Tafsir sample ─────────────────────────────────────────────────────
const tafsirs = {
  tafsir_ibn_katheer: 'tafsir-ibn-katheer',
  tafsir_altabari: 'tafsir-altabari',
  tafsir_alsaadi: 'tafsir-alsaadi',
  tafsir_albaghawi: 'tafsir-albaghawi',
  tafsir_almokhtassar: 'tafsir-almokhtassar',
};
const sample = {};
for (const [, slug] of Object.entries(tafsirs)) {
  const file = findFile(join(raw, slug), /\.csv$/i);
  for (const r of parseCsv(readFileSync(file, 'utf8'))) {
    const s = r['surah'] ?? r['رقم السورة'];
    const a = r['ayah'] ?? r['رقم الآية'];
    const key = `${s}:${a}`;
    if (!SAMPLE_AYAT.includes(key)) continue;
    if ((r['قابل للنشر'] ?? 'نعم') !== 'نعم') continue; // publisher says not publishable
    (sample[key] ??= {})[slug] = {
      edition: r['المشروع'] || null,
      stage: r['مرحلة العمل'] || null, // publisher workflow: الادخال / المراجعة / الاعتماد
      text: r['text'] ?? r['المحتوى'],
      footnote: r['الهامش'] || null,
    };
  }
}
writeFileSync(join(out, 'tafsir-sample.json'), JSON.stringify({ _source: 'Itqan registry · مركز تفسير · CC BY-ND', ayat: sample }, null, 1) + '\n');
console.log(`Tafsir sample: ${Object.keys(sample).length} ayah(s) × ${Object.keys(tafsirs).length} tafsirs`);

// ── Surah + juz index (names/ayah counts/juz starts from KFGQPC; Makki/Madani from quran-meta, MIT) ──
const { createHafs } = await import('quran-meta');
const qm = createHafs();
const surahIndex = [];
for (let s = 1; s <= 114; s++) {
  const m = qm.getSurahMeta(s);
  const count = Object.keys(ayat).filter((k) => k.startsWith(`${s}:`)).length;
  if (count !== m.ayahCount) throw new Error(`Ayah count mismatch for surah ${s}`);
  surahIndex.push({ n: s, name: surahs[s], ayat: count, type: m.isMeccan ? 'مكية' : 'مدنية', page: pos[`${s}:1`][0] });
}
const juzStarts = [];
for (const a of hafs) if (!juzStarts[a.jozz - 1]) juzStarts[a.jozz - 1] = { juz: a.jozz, surah: a.sura_no, ayah: a.aya_no, page: a.page };
writeFileSync(join(out, 'quran-index.json'), JSON.stringify({ surahs: surahIndex, juz: juzStarts }) + '\n');
console.log(`Index: ${surahIndex.length} surahs, ${juzStarts.length} juz`);
