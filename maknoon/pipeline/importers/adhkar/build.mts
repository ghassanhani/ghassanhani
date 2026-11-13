#!/usr/bin/env node
// Adhkar from their hadith (founder decision 2026-11-13: «from the hadith source»).
//
//   node --experimental-strip-types pipeline/importers/adhkar/build.mts     after npm run hadith:build
//
// Each dhikr below names WHERE it is narrated (books to look in, in order) and HOW to find it (the
// opening words of the dhikr, and optionally its closing words), never its text. The builder finds
// the hadith in the verified Sunnah.com packs and cuts the dhikr out of that hadith's matn exactly as
// written there (diacritics included): the excerpt is a slice of the source string, never retyped.
//
// Verification (a dhikr that fails is left OUT and listed, never guessed):
//   · the opening (and closing) words are found in a hadith of the named books
//   · the excerpt is a contiguous slice of that hadith's matn (checked with indexOf on the raw text)
// Output: assets/content/adhkar.json  { cat → [ { id, label?, n, virtue?, text, hadith, ref, grades } ] }
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
type Grade = { s: string; a: string; by: string };
type H = { id: string; n: string; matn: string; g: Grade[]; url: string };
const packs = new Map<string, { name: string; hadith: H[] }>();
const pack = (slug: string) => {
  if (!packs.has(slug)) packs.set(slug, JSON.parse(gunzipSync(readFileSync(join(root, 'hosted/hadith', `${slug}.json.gz`))).toString('utf8')));
  return packs.get(slug)!;
};

/** Letters only (no diacritics, tatweel, Quranic marks or punctuation; alef/ya/ta forms unified),
 *  with, for every kept letter, its index in the raw string. */
function fold(raw: string) {
  let s = '';
  const at: number[] = [];
  let space = false;
  for (let i = 0; i < raw.length; i++) {
    let c = raw[i];
    if (/[ً-ٰٟۖ-ۭـ]/.test(c)) continue;
    if (/[أإآٱ]/.test(c)) c = 'ا';
    else if (c === 'ى') c = 'ي';
    else if (c === 'ة') c = 'ه';
    else if (c === 'ؤ') c = 'و';
    else if (c === 'ئ') c = 'ي';
    else if (c === 'ء') continue;
    if (!/[ء-ي]/.test(c)) {
      space = s.length > 0;
      continue;
    }
    if (space) {
      s += ' ';
      at.push(i);
      space = false;
    }
    s += c;
    at.push(i);
  }
  return { s, at };
}
const f = (t: string) => fold(t).s;

type Spec = { cat: string; id: string; label?: string; n: number; virtue?: string; books: string[]; find?: string; from: string; to?: string };
// The adhkar the app lists (categories, counts and virtues as already reviewed in the app), with where
// each is narrated. `find`: words that identify the hadith (default `from`); `from`/`to`: the dhikr's
// first and last words inside it, used only to cut it out.
const SPECS: Spec[] = [
  { cat: 'sabah', id: 's3', label: 'سيد الاستغفار', n: 1, books: ['bukhari'], from: 'اللهم انت ربي لا اله الا انت خلقتني', to: 'فانه لا يغفر الذنوب الا انت' },
  { cat: 'sabah', id: 's4', n: 1, books: ['muslim'], from: 'امسينا وامسى الملك لله', to: 'وعذاب في القبر' },
  { cat: 'sabah', id: 's5', n: 1, books: ['tirmidhi', 'abudawud', 'ibnmajah'], from: 'اللهم بك اصبحنا وبك امسينا', to: 'واليك النشور' },
  { cat: 'sabah', id: 's6', n: 3, books: ['tirmidhi', 'abudawud', 'ibnmajah'], from: 'بسم الله الذي لا يضر مع اسمه شي', to: 'وهو السميع العليم' },
  { cat: 'sabah', id: 's7', n: 3, books: ['abudawud', 'tirmidhi', 'ibnmajah'], from: 'رضيت بالله ربا', to: 'نبيا' },
  { cat: 'sabah', id: 's9', label: 'في المساء', n: 3, books: ['muslim', 'tirmidhi'], from: 'اعوذ بكلمات الله التامات من شر ما خلق' },
  { cat: 'mutlaq', id: 'm1', n: 1, virtue: 'أحبّ الكلام إلى الله', books: ['muslim'], from: 'سبحان الله والحمد لله ولا اله الا الله والله اكبر' },
  { cat: 'mutlaq', id: 'm2', n: 100, virtue: 'تُحطّ خطاياه وإن كانت مثل زبد البحر', books: ['bukhari', 'muslim'], find: 'سبحان الله وبحمده في يوم ماية مره', from: 'سبحان الله وبحمده' },
  { cat: 'mutlaq', id: 'm3', n: 1, virtue: 'خفيفتان على اللسان، ثقيلتان في الميزان، حبيبتان إلى الرحمن', books: ['bukhari', 'muslim'], find: 'كلمتان خفيفتان على اللسان', from: 'سبحان الله وبحمده', to: 'سبحان الله العظيم' },
  { cat: 'mutlaq', id: 'm4', n: 3, books: ['muslim'], from: 'سبحان الله وبحمده عدد خلقه', to: 'ومداد كلماته' },
  { cat: 'mutlaq', id: 'm5', n: 100, virtue: 'عدل عشر رقاب، ومئة حسنة، وحرز من الشيطان يومه', books: ['bukhari', 'muslim'], find: 'لا اله الا الله وحده لا شريك له له الملك وله الحمد وهو على كل شي قدير في يوم ماية مره', from: 'لا اله الا الله وحده', to: 'على كل شي قدير' },
  { cat: 'mutlaq', id: 'm6', n: 1, virtue: 'كنز من كنوز الجنة', books: ['bukhari', 'muslim'], find: 'كنز من كنوز الجنه', from: 'لا حول ولا قوه الا بالله' },
  { cat: 'mutlaq', id: 'm8', n: 1, virtue: 'من صلّى عليه واحدة صلّى الله عليه بها عشرًا', books: ['muslim'], from: 'من صلى علي واحده', to: 'عشرا' },
  { cat: 'salah', id: 'p2', n: 1, books: ['muslim'], from: 'اللهم انت السلام ومنك السلام', to: 'والاكرام' },
  { cat: 'salah', id: 'p3', n: 100, books: ['muslim'], from: 'من سبح الله في دبر كل صلاه ثلاثا وثلاثين', to: 'زبد البحر' },
  { cat: 'nawm', id: 'n2', label: 'تسبيح فاطمة', n: 100, books: ['bukhari', 'muslim'], from: 'تكبرا اربعا وثلاثين', to: 'وتحمدا ثلاثه وثلاثين' },
  { cat: 'nawm', id: 'n3', n: 1, books: ['bukhari'], from: 'باسمك اللهم اموت واحيا' },
  { cat: 'nawm', id: 'n4', label: 'عند الاستيقاظ', n: 1, books: ['bukhari'], from: 'الحمد لله الذي احيانا بعد ما اماتنا واليه النشور' },
  { cat: 'occ', id: 'o2', label: 'الخروج من المنزل', n: 1, books: ['abudawud', 'tirmidhi'], from: 'بسم الله توكلت على الله لا حول ولا قوه الا بالله' },
  { cat: 'occ', id: 'o3', label: 'المسجد', n: 1, books: ['muslim'], from: 'اللهم افتح لي ابواب رحمتك', to: 'من فضلك' },
  { cat: 'occ', id: 'o4', label: 'الخلاء', n: 1, books: ['bukhari', 'muslim'], from: 'اللهم اني اعوذ بك من الخبث والخبايث' },
  { cat: 'occ', id: 'o6', label: 'لبس الثوب', n: 1, books: ['abudawud', 'tirmidhi', 'ibnmajah'], from: 'الحمد لله الذي كساني', to: 'ولا قوه' },
];

const out: Record<string, unknown[]> = {};
const missing: string[] = [];
for (const sp of SPECS) {
  const from = f(sp.from);
  const to = sp.to ? f(sp.to) : null;
  let found: { slug: string; h: H; text: string } | null = null;
  for (const slug of sp.books) {
    for (const h of pack(slug).hadith) {
      const { s, at } = fold(h.matn);
      if (sp.find && !s.includes(f(sp.find))) continue;
      const a = s.indexOf(from);
      if (a < 0) continue;
      let b = a + from.length; // end (exclusive) in folded text
      if (to) {
        const e = s.indexOf(to, a + from.length - Math.min(from.length, to.length));
        if (e < 0 || e - a > 600) continue;
        b = e + to.length;
      }
      // raw slice: from the first kept letter to just after the last one (with its diacritics)
      const start = at[a];
      let end = at[b - 1] + 1;
      while (end < h.matn.length && /[ً-ٰٟۖ-ۭـ]/.test(h.matn[end])) end++;
      const text = h.matn.slice(start, end);
      if (h.matn.indexOf(text) < 0) continue; // cannot happen: a slice is always found
      found = { slug, h, text };
      break;
    }
    if (found) break;
  }
  if (!found) {
    missing.push(`${sp.id} (${sp.books.join('/')}): «${sp.from}»`);
    continue;
  }
  const p = pack(found.slug);
  (out[sp.cat] ??= []).push({ id: sp.id, label: sp.label, n: sp.n, virtue: sp.virtue, text: found.text, hadith: `${found.slug}:${found.h.id}`, ref: `${p.name} ${found.h.n}`, grades: found.h.g, url: found.h.url });
  console.log(`✓ ${sp.id.padEnd(3)} ${p.name} ${found.h.n} · ${found.text.slice(0, 60)}${found.text.length > 60 ? '…' : ''}`);
}
const file = join(root, 'assets/content/adhkar.json');
writeFileSync(`${file}.tmp`, JSON.stringify({ _source: 'Sunnah.com (each dhikr cut verbatim from its hadith; see pipeline/importers/adhkar)', _license: 'CC BY-NC-SA 4.0', adhkar: out }));
renameSync(`${file}.tmp`, file);
console.log(`\n${SPECS.length - missing.length} of ${SPECS.length} adhkar found in their hadith and written.`);
if (missing.length) console.log(`Not found (left out, kept as they were in the app, marked for review):\n  ${missing.join('\n  ')}`);
