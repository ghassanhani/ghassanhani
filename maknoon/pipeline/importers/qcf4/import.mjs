#!/usr/bin/env node
// QCF4 importer: the Madinah Mushaf 1441 page layout and glyph fonts (King Fahd Complex,
// calligraphy by Uthman Taha; font files prepared by Ahmad ElGharib) from the npm package
// `quran-qcf4` (page data MIT; fonts © King Fahd Complex).
//
// Founder decision, 2026-11-13: use the QCF4 fonts on the founder's own responsibility
// ("استخدم خط المدينة على مسؤليتي"). See docs/SPEC.md §4 and docs/STATUS.md.
//
//   node pipeline/importers/qcf4/import.mjs            verify, then write
//   node pipeline/importers/qcf4/import.mjs --if-needed  skip when the outputs are already current (postinstall)
//
// Nothing is written unless every check passes; on failure the app keeps the Unicode text.
// The text shown to the reader is the glyphs themselves, so the checks tie every glyph to the
// verified KFGQPC Hafs text already in the app (assets/content/quran-hafs.json):
//   1. structure: 604 pages, 15 lines (8 on pages 1–2), 114 surah headers, 112 basmalas
//   2. order: every ayah once, in mushaf order, words numbered 1..n, one end mark last
//   3. text: each glyph's word, letter skeleton for letter skeleton, equals the Hafs words of that ayah
//   4. fonts: every glyph code exists in its page font and draws something
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const require = createRequire(import.meta.url);
const outData = join(root, 'assets/content/qcf4-pages.json');
const outFonts = join(root, 'assets/fonts/qcf4');
const outModule = join(root, 'src/theme/qcf4.local.native.ts');
const ifNeeded = process.argv.includes('--if-needed');

let pkgDir;
try {
  pkgDir = dirname(require.resolve('quran-qcf4')); // its main file (index.json) sits at the package root
} catch {
  console.warn('qcf4: package quran-qcf4 not installed; the Mushaf keeps the Unicode text.');
  process.exit(0);
}
const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
const sha = (b) => createHash('sha256').update(b).digest('hex');

// Inputs, and a fingerprint of them (package files + the Hafs text they are checked against)
const hafsRaw = readFileSync(join(root, 'assets/content/quran-hafs.json'));
const pageFiles = Array.from({ length: 604 }, (_, i) => join(pkgDir, 'pages', `${String(i + 1).padStart(3, '0')}.json`));
const fontDir = join(pkgDir, 'fonts-woff2');
const fontFiles = readdirSync(fontDir).filter((f) => f.endsWith('.woff2')).sort();
const h = createHash('sha256');
h.update(hafsRaw);
for (const f of pageFiles) h.update(readFileSync(f));
for (const f of fontFiles) h.update(readFileSync(join(fontDir, f)));
const fingerprint = h.digest('hex');

if (ifNeeded && existsSync(outData) && existsSync(outModule)) {
  try {
    const cur = JSON.parse(readFileSync(outData, 'utf8'));
    const fontsThere = fontFiles.every((f) => existsSync(join(outFonts, f.replace('.woff2', '.ttf'))));
    if (cur._verify?.input === fingerprint && fontsThere && readFileSync(outModule, 'utf8').includes('require(')) {
      console.log('qcf4: up to date.');
      process.exit(0);
    }
  } catch {
    // fall through and rebuild
  }
}

const fail = [];
const check = (ok, msg) => {
  if (!ok) fail.push(msg);
};

// ── Hafs reference
const hafs = JSON.parse(hafsRaw.toString('utf8')).ayat;
const keys = Object.keys(hafs);
const ayahIndex = new Map(keys.map((k, i) => [k, i + 1]));
const MARK = /^[-ﭐ-﷿ﹰ-﻿۝۞۩٠-٩]+$/;
const tokens = (s) => s.split(/\s+/).filter((t) => t && !MARK.test(t));
const decode = (s) => s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
// Letter skeleton: no marks, joiners or tatweel; alef/hamza/ya/waw seats folded away, so
// Uthmani spelling (Hafs text) and the package's simpler spelling compare letter for letter.
const fold = (s) =>
  decode(s)
    .replace(/[ؐ-ًؚ-ٰٟۖ-ۭ࣓-ࣿـ​-‏]/g, '')
    .replace(/[ٱأإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[ؤئ]/g, 'ء')
    .replace(/[اويء]/g, '');

// ── Fonts
const fontkit = await import('fontkit');
// Open fonts one at a time (each parsed font caches its outlines): the header font stays,
// the page font is swapped as the pages move on.
const fileOf = Object.fromEntries(fontFiles.map((f) => [f.replace(/(_W)?\.woff2$/, ''), f]));
const open = {};
const fonts = new Proxy({}, {
  get(_, name) {
    if (typeof name !== 'string' || !fileOf[name]) return undefined;
    if (!open[name]) {
      for (const k of Object.keys(open)) if (k !== 'QCF4_QBSML') delete open[k];
      open[name] = fontkit.create(readFileSync(join(fontDir, fileOf[name])));
    }
    return open[name];
  },
});
const glyphCount = {};
const glyphOk = new Map();
const glyphCheck = (fontName, code) => {
  const id = `${fontName}:${code}`;
  if (!glyphOk.has(id)) {
    const font = fonts[fontName];
    glyphCount[fontName] ??= font?.numGlyphs;
    const ok = !!font && font.hasGlyphForCodePoint(code) && (() => {
      const b = font.glyphForCodePoint(code).bbox;
      return b && b.maxX > b.minX && b.maxY > b.minY;
    })();
    glyphOk.set(id, ok);
  }
  return glyphOk.get(id);
};
const em = (fontName, code) => fonts[fontName].glyphForCodePoint(code).advanceWidth / fonts[fontName].unitsPerEm;

// ── Walk the pages
const order = [];
const qWords = new Map(); // key → [{pos, text}]
const ends = new Map();
let headers = 0;
let basmalas = 0;
let glyphs = 0;
let maxLineEm = 0;
const headerSuras = new Set();
const pages = [];
for (let p = 1; p <= 604; p++) {
  const pg = JSON.parse(readFileSync(pageFiles[p - 1], 'utf8'));
  check(pg.page === p, `page ${p}: wrong page number ${pg.page}`);
  check(pg.lines.length === (p <= 2 ? 8 : 15), `page ${p}: ${pg.lines.length} lines`);
  const outLines = [];
  for (const ln of pg.lines) {
    const ws = ln.words;
    for (const w of ws) {
      glyphs++;
      check(glyphCheck(w.font, w.code), `page ${p} line ${ln.line}: glyph ${w.code} missing in ${w.font}`);
      if (w.type === 'word' || w.type === 'end') {
        if (order[order.length - 1] !== w.verse_key) order.push(w.verse_key);
      }
      if (w.type === 'word') {
        if (!qWords.has(w.verse_key)) qWords.set(w.verse_key, []);
        qWords.get(w.verse_key).push({ pos: w.position, text: w.text });
      } else if (w.type === 'end') {
        if (!ends.has(w.verse_key)) ends.set(w.verse_key, []);
        ends.get(w.verse_key).push(w.position);
      }
    }
    const kinds = new Set(ws.map((w) => w.type));
    if (kinds.has('surah_header')) {
      check(ws.length === 1, `page ${p} line ${ln.line}: header shares its line`);
      headers++;
      headerSuras.add(ws[0].sura);
      outLines.push({ h: ws[0].sura });
    } else if (kinds.has('bismillah')) {
      check(ws.length === 1, `page ${p} line ${ln.line}: basmala shares its line`);
      basmalas++;
      outLines.push({ b: String.fromCodePoint(ws[0].code), f: ws[0].font });
    } else {
      let lineEm = 0;
      for (const w of ws) lineEm += em(w.font, w.code);
      if (p > 2) maxLineEm = Math.max(maxLineEm, lineEm + 0.12 * (ws.length - 1));
      outLines.push({ g: ws.map((w) => String.fromCodePoint(w.code)).join(''), _w: ws });
    }
    // headers come from the header font; every basmala is the one glyph in the first page font
    check(ws.every((w) => w.font === pg.font || (w.type === 'surah_header' && w.font === 'QCF4_QBSML') || (w.type === 'bismillah' && w.font === 'QCF4_Hafs_01')), `page ${p}: unexpected font on line ${ln.line}`);
  }
  pages.push({ f: pg.font, l: outLines });
}

check(headers === 114 && headerSuras.size === 114, `surah headers: ${headers} (${headerSuras.size} distinct)`);
check(basmalas === 112, `basmalas: ${basmalas}`);
check(order.length === keys.length && order.every((k, i) => k === keys[i]), 'ayah order differs from the Hafs text');
for (const k of keys) {
  const ws = (qWords.get(k) ?? []).sort((a, b) => a.pos - b.pos);
  check(ws.every((w, i) => w.pos === i + 1), `${k}: word positions not 1..n`);
  const e = ends.get(k) ?? [];
  check(e.length === 1 && e[0] === ws.length + 1, `${k}: end mark`);
}

// ── Tie every glyph word to a Hafs word (token index), skeleton for skeleton
const SAJDA = '#1969'; // the ۩ sign, drawn as its own glyph
const tokenOf = new Map(); // `${key}:${pos}` → token index, or -2 for a mark
const splits = [];
for (const k of keys) {
  const hs = tokens(hafs[k]);
  const ws = (qWords.get(k) ?? []).sort((a, b) => a.pos - b.pos);
  let t = 0;
  let acc = '';
  let pending = [];
  for (const w of ws) {
    if (w.text === SAJDA) {
      tokenOf.set(`${k}:${w.pos}`, -2);
      continue;
    }
    acc += fold(w.text);
    pending.push(w.pos);
    const target = hs[t] === undefined ? null : fold(hs[t]);
    if (target === acc) {
      for (const pos of pending) tokenOf.set(`${k}:${pos}`, t);
      if (pending.length > 1) splits.push(`${k} «${hs[t]}» in ${pending.length} glyphs`);
      t++;
      acc = '';
      pending = [];
    } else if (target === null || !target.startsWith(acc)) {
      fail.push(`${k}: glyph word ${w.pos} «${decode(w.text)}» does not match Hafs word ${t + 1} «${hs[t] ?? '—'}»`);
      break;
    }
  }
  check(t === hs.length && !pending.length, `${k}: ${t} of ${hs.length} Hafs words matched`);
}

if (fail.length) {
  console.error(`qcf4: verification FAILED (${fail.length}); nothing written. First problems:\n  ` + fail.slice(0, 20).join('\n  '));
  process.exit(ifNeeded ? 0 : 1);
}

// ── Compact page data: glyph string per line + ayah number and Hafs word index per glyph
for (const pg of pages) {
  for (const ln of pg.l) {
    if (!ln._w) continue;
    ln.a = ln._w.map((w) => (w.verse_key ? ayahIndex.get(w.verse_key) : 0));
    ln.i = ln._w.map((w) => (w.type === 'word' ? tokenOf.get(`${w.verse_key}:${w.position}`) : w.type === 'end' ? -1 : -2));
    delete ln._w;
  }
}
const f1 = fontkit.create(readFileSync(join(fontDir, fileOf.QCF4_Hafs_01)));
const data = {
  _source: `QCF4 Hafs (Madinah Mushaf 1441, King Fahd Complex; calligraphy Uthman Taha; font files Ahmad ElGharib) via npm quran-qcf4 ${pkg.version}`,
  _license: 'Fonts © King Fahd Complex, used by founder decision 2026-11-13; page data MIT (Mohamad Hajj Rabee)',
  _source_id: 'kfgqpc',
  _edition_id: 'kfgqpc-qcf4-hafs-1441',
  _license_id: 'founder-decision-2026-11-13',
  _verify: {
    input: fingerprint,
    pages: 604,
    ayat: keys.length,
    glyphs,
    headers,
    basmalas,
    splitWords: splits,
  },
  // em: widest line (glyph advances + 0.12em gaps), so the app can size every page alike
  em: { line: +maxLineEm.toFixed(4), ascent: +(f1.ascent / f1.unitsPerEm).toFixed(4), descent: +(-f1.descent / f1.unitsPerEm).toFixed(4) },
  pages,
};

// ── Write: fonts (WOFF2 → TTF, same glyphs; iOS/Android load TTF), data, font module
const { decompress } = await import('wawoff2');
const tmpFonts = `${outFonts}.tmp`;
rmSync(tmpFonts, { recursive: true, force: true });
mkdirSync(tmpFonts, { recursive: true });
const entries = [];
for (const f of fontFiles) {
  const ttf = Buffer.from(await decompress(readFileSync(join(fontDir, f))));
  const check2 = fontkit.create(ttf);
  if (check2.numGlyphs !== glyphCount[f.replace(/(_W)?\.woff2$/, '')]) {
    console.error(`qcf4: ${f} changed while converting; nothing written.`);
    rmSync(tmpFonts, { recursive: true, force: true });
    process.exit(ifNeeded ? 0 : 1);
  }
  const name = f.replace('.woff2', '.ttf');
  writeFileSync(join(tmpFonts, name), ttf);
  entries.push(`  '${f.replace(/(_W)?\.woff2$/, '')}': require('../../assets/fonts/qcf4/${name}'),`);
}
rmSync(outFonts, { recursive: true, force: true });
renameSync(tmpFonts, outFonts);
writeFileSync(join(outFonts, '.gitkeep'), '');

writeFileSync(`${outData}.tmp`, JSON.stringify(data));
renameSync(`${outData}.tmp`, outData);

writeFileSync(
  outModule,
  `// Generated by pipeline/importers/qcf4/import.mjs (iOS/Android only). Font files stay git-ignored.\n` +
    `export const qcf4Fonts: Record<string, number> = {\n${entries.join('\n')}\n};\n`,
);
try {
  execFileSync('git', ['update-index', '--skip-worktree', 'src/theme/qcf4.local.native.ts'], { cwd: root, stdio: 'ignore' });
} catch {
  // not a git checkout
}

console.log(
  `qcf4: verified and written. ${data._verify.pages} pages, ${data._verify.ayat} ayat, ${glyphs} glyphs, ` +
    `${headers} surah headers, ${basmalas} basmalas, ${entries.length} fonts. Words drawn in two glyphs: ${splits.length ? splits.join('; ') : 'none'}.`,
);
console.log(`qcf4: data sha256 ${sha(readFileSync(outData))}`);
