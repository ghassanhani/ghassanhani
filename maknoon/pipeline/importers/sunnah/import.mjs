#!/usr/bin/env node
// Hadith importer: Sunnah.com, via the freococo/sunnah_dataset snapshot on Hugging Face
// (founder decision 2026-11-13; licence CC BY-NC-SA 4.0, credit «Sunnah.com»).
//
//   npm run hadith:pull      downloads the pinned snapshot to pipeline/raw/sunnah/ and checks its SHA-256
//   npm run hadith:build     verifies it and writes the packs
//
// Text policy (CLAUDE.md rule 1): the chain (arabic_sanad) and the text (arabic_matn) are stored
// exactly as in the source; arabic_full is not used (the scrape ran some words together). Gradings
// are stored exactly as given (status and grader as written) and are never invented: a hadith with
// no grading in the source has none here (Bukhari and Muslim carry none on Sunnah.com).
//
// Verification before anything is written (any failure → nothing is written):
//   · the file's SHA-256 is the pinned one, and it has 39,318 rows
//   · every row has a known collection, a hadith_id unique within it, and non-empty sanad or matn
//   · per-collection counts are exactly the snapshot's (COUNTS below)
//   · every stored sanad/matn is byte-identical to its source cell (re-read after writing)
//   · every grading parses, and only empty entries are dropped (counted)
//
// Output:
//   hosted/hadith/<slug>.json.gz       one pack per book: every hadith, with its book/chapter titles
//   assets/content/hadith-index.json   the books, their chapters' ranges and the packs' sizes and SHA-256
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync, gzipSync } from 'node:zlib';
import { asyncBufferFromFile, parquetReadObjects } from 'hyparquet';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
export const SNAPSHOT = {
  repo: 'freococo/sunnah_dataset',
  revision: 'cc2f95cc070367c3ad6c5b672a6d16673dab566f',
  file: 'sunnah_com_dataset.parquet',
  sha256: 'e95148587e5505a3bbf85e9f5a573119eeff5ee48438983eac928853d18932ae',
  rows: 39318,
};
const RAW = join(root, 'pipeline/raw/sunnah', SNAPSHOT.file);

// The books, in the order the app lists them; Arabic titles as the books are known.
export const BOOKS = [
  { slug: 'bukhari', collection: 'Sahih al-Bukhari', name: 'صحيح البخاري', count: 7558 },
  { slug: 'muslim', collection: 'Sahih Muslim', name: 'صحيح مسلم', count: 2922 },
  { slug: 'abudawud', collection: 'Sunan Abi Dawud', name: 'سنن أبي داود', count: 5274 },
  { slug: 'tirmidhi', collection: 'Jami` at-Tirmidhi', name: 'جامع الترمذي', count: 3951 },
  { slug: 'nasai', collection: "Sunan an-Nasa'i", name: 'سنن النسائي', count: 5756 },
  { slug: 'ibnmajah', collection: 'Sunan Ibn Majah', name: 'سنن ابن ماجه', count: 4335 },
  { slug: 'riyadussalihin', collection: 'Riyad as-Salihin', name: 'رياض الصالحين', count: 1896 },
  { slug: 'adab', collection: 'Al-Adab Al-Mufrad', name: 'الأدب المفرد', count: 1181 },
  { slug: 'shamail', collection: "Ash-Shama'il Al-Muhammadiyah", name: 'الشمائل المحمدية', count: 417 },
  { slug: 'mishkat', collection: 'Mishkat al-Masabih', name: 'مشكاة المصابيح', count: 5527 },
  { slug: 'bulugh', collection: 'Bulugh al-Maram', name: 'بلوغ المرام', count: 501 },
];

const fail = [];
const sha = createHash('sha256').update(readFileSync(RAW)).digest('hex');
if (sha !== SNAPSHOT.sha256) fail.push(`snapshot SHA-256 ${sha}, expected ${SNAPSHOT.sha256}`);

const file = await asyncBufferFromFile(RAW);
const rows = await parquetReadObjects({
  file,
  columns: ['collection', 'hadith_id', 'hadith_no_in_book', 'book_no', 'book_ar', 'chapter_no', 'chapter_ar', 'arabic_sanad', 'arabic_matn', 'gradings', 'url', 'ref_raw'],
});
if (rows.length !== SNAPSHOT.rows) fail.push(`${rows.length} rows, expected ${SNAPSHOT.rows}`);

const byCollection = new Map(BOOKS.map((b) => [b.collection, b]));
const packs = new Map(BOOKS.map((b) => [b.slug, []]));
const seen = new Set();
let droppedGrades = 0;
let keptGrades = 0;
for (const r of rows) {
  const b = byCollection.get(r.collection);
  if (!b) {
    fail.push(`unknown collection «${r.collection}»`);
    continue;
  }
  const id = `${b.slug}:${r.hadith_id}`;
  if (seen.has(id)) fail.push(`${id}: duplicate`);
  seen.add(id);
  if (!(r.arabic_sanad || '').trim() && !(r.arabic_matn || '').trim()) fail.push(`${id}: no Arabic text`);
  let grades;
  try {
    grades = JSON.parse(r.gradings || '[]');
  } catch {
    fail.push(`${id}: gradings do not parse`);
    grades = [];
  }
  const g = [];
  for (const x of grades) {
    const status = x.status ?? x.status_en ?? '';
    const statusAr = x.status_ar ?? x.arabic ?? '';
    if (!status.trim() && !statusAr.trim()) {
      droppedGrades++;
      continue;
    }
    keptGrades++;
    g.push({ s: status, a: statusAr, by: x.scholar ?? '' });
  }
  packs.get(b.slug).push({
    id: r.hadith_id,
    n: (r.ref_raw ?? '').replace(r.collection, '').trim() || String(r.hadith_no_in_book ?? r.hadith_id).replace(/\.0$/, ''), // the number as printed (e.g. «272, 273»)
    b: r.book_no,
    c: r.chapter_no,
    sanad: r.arabic_sanad ?? '',
    matn: r.arabic_matn ?? '',
    g,
    url: r.url,
    _chapter: r.chapter_ar ?? '',
    _book: r.book_ar ?? '',
  });
}
for (const b of BOOKS) if (packs.get(b.slug).length !== b.count) fail.push(`${b.slug}: ${packs.get(b.slug).length} hadith, expected ${b.count}`);

if (fail.length) {
  console.error(`Hadith verification FAILED (${fail.length}); nothing written.\n  ` + fail.slice(0, 20).join('\n  '));
  process.exit(1);
}

// Write: one gzip pack per book (titles once per book/chapter), and the bundled index.
const outDir = join(root, 'hosted/hadith');
mkdirSync(outDir, { recursive: true });
const index = { _source: 'Sunnah.com (via the freococo/sunnah_dataset snapshot)', _license: 'CC BY-NC-SA 4.0', _credit: 'Sunnah.com', _snapshot: SNAPSHOT, books: [] };
for (const b of BOOKS) {
  const list = packs.get(b.slug);
  const books = {};
  const chapters = {};
  for (const h of list) {
    books[h.b] ??= h._book;
    chapters[`${h.b}.${h.c}`] ??= h._chapter;
  }
  const hadith = list.map(({ _book, _chapter, ...h }) => h);
  const body = JSON.stringify({ slug: b.slug, name: b.name, credit: 'Sunnah.com', license: 'CC BY-NC-SA 4.0', books, chapters, hadith });
  const gz = gzipSync(Buffer.from(body), { level: 9 });
  const path = join(outDir, `${b.slug}.json.gz`);
  writeFileSync(`${path}.tmp`, gz);
  renameSync(`${path}.tmp`, path);
  // read back and compare every text cell byte for byte with the source rows
  const back = JSON.parse(gunzipSync(readFileSync(path)).toString('utf8'));
  list.forEach((h, i) => {
    if (back.hadith[i].sanad !== h.sanad || back.hadith[i].matn !== h.matn) fail.push(`${b.slug}:${h.id} differs after writing`);
  });
  const bookList = Object.entries(books).map(([no, name]) => ({ no, name, count: list.filter((h) => h.b === no).length }));
  index.books.push({ slug: b.slug, name: b.name, count: list.length, graded: list.filter((h) => h.g.length).length, bytes: gz.length, sha256: createHash('sha256').update(gz).digest('hex'), books: bookList });
  console.log(`${b.slug.padEnd(15)} ${String(list.length).padStart(5)} hadith · ${(gz.length / 1e6).toFixed(1)} MB packed`);
}
if (fail.length) {
  console.error(`Read-back FAILED (${fail.length}).\n  ` + fail.slice(0, 20).join('\n  '));
  process.exit(1);
}
const out = join(root, 'assets/content/hadith-index.json');
writeFileSync(`${out}.tmp`, JSON.stringify(index));
renameSync(`${out}.tmp`, out);
console.log(`\nVerified: ${rows.length} hadith, ${keptGrades} gradings kept (${droppedGrades} empty entries dropped). Index written.`);
