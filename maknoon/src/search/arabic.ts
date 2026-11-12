/**
 * Arabic text analysis for search (plan §7.3). Dependency-free so the build
 * script (node --experimental-strip-types) and the app share it.
 *
 *  normalize → strip tashkeel/Quranic marks/tatweel, unify hamza/alef/ya/ta-marbuta
 *  stem      → remove clitic prefixes/suffixes
 *  root      → light root extraction (triliteral patterns); heuristic, not a full
 *              morphological analyser — good enough to group derivatives for search.
 * Display text is never touched.
 */

function base(s: string, hamza: (s: string) => string): string {
  return hamza(
    s
      .replace(/[ً-ٰٟۖ-ۭـࣰ-ࣿ]/g, '') // tashkeel, Quranic annotation marks, tatweel
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه'),
  )
    .replace(/[^ء-ي\s]/g, ' ') // punctuation, digits, Latin
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The shared normalizer, exactly SPEC §5: strip tashkeel/tatweel/Quranic marks,
 * أ إ آ ٱ → ا · ى → ي · ة → ه · ؤ → و · ئ → ي, collapse whitespace, strip punctuation.
 * For `body_ar_norm`, queries and recitation matching. Canonical text is never touched.
 */
export function normalize(s: string): string {
  return base(s, (x) => x.replace(/ؤ/g, 'و').replace(/ئ/g, 'ي'));
}

/**
 * Search key = normalize + every hamza seat folded to alef, so سأل · سئل · سؤال share
 * one stem and root. Used for index terms and query terms only (a superset of §5).
 */
export function fold(s: string): string {
  return base(s, (x) => x.replace(/[ؤئء]/g, 'ا'));
}

// Clitics. Multi-letter ones are safe to remove. One-letter ones are ambiguous (the ك of كتاب
// is a root letter, the ب of بدين is not), so every word is analysed BOTH ways — see variants().
const MULTI_PREFIXES = ['وبال', 'وكال', 'فبال', 'وال', 'فال', 'بال', 'كال', 'لل', 'ال', 'وس', 'فس'];
const SINGLE_PREFIXES = ['و', 'ف', 'ب', 'ك', 'ل', 'س'];
const MULTI_SUFFIXES = ['تموها', 'كموها', 'هما', 'كما', 'تما', 'تم', 'تن', 'هم', 'هن', 'كم', 'كن', 'نا', 'ها', 'ون', 'ين', 'ان', 'ات', 'وا'];
const SINGLE_SUFFIXES = ['ه', 'ي', 'ك', 'ت', 'ا'];
const ALL_SUFFIXES = [...MULTI_SUFFIXES, ...SINGLE_SUFFIXES];

function stripPrefix(s: string, single: boolean): string {
  const m = MULTI_PREFIXES.find((p) => s.startsWith(p) && s.length - p.length >= 3);
  if (m) return s.slice(m.length);
  if (single && SINGLE_PREFIXES.includes(s[0]) && s.length - 1 >= 3) return s.slice(1);
  return s;
}
function stripSuffixes(s: string, single: boolean): string {
  const list = single ? ALL_SUFFIXES : MULTI_SUFFIXES;
  for (let i = 0; i < 2; i++) {
    const suf = list.find((x) => s.endsWith(x) && s.length - x.length >= 3);
    if (!suf) break;
    s = s.slice(0, -suf.length);
  }
  return s;
}

/**
 * Candidate stems of a folded word: with and without its one-letter clitics.
 * `clitic` marks candidates that dropped a one-letter prefix (unlikely in a typed query).
 */
export function variants(w: string): { stem: string; clitic: boolean }[] {
  const out: { stem: string; clitic: boolean }[] = [];
  for (const p of [false, true])
    for (const sfx of [true, false]) {
      const st = stripSuffixes(stripPrefix(w, p), sfx);
      if (!out.some((o) => o.stem === st)) out.push({ stem: st, clitic: p && stripPrefix(w, true) !== stripPrefix(w, false) });
    }
  return out;
}

/** Primary stem: definite article / conjunction+article and suffixes removed, one-letter prefixes kept. */
export function stem(w: string): string {
  return stripSuffixes(stripPrefix(w, false), true);
}

// Common derivational patterns: (regex on the stem) → indices of root letters.
const PATTERNS: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^[يتنا]?ست(...)$/, (m) => m[1]], // يستفعل / استفعل
  [/^م(..)و(.)$/, (m) => m[1] + m[2]], // مفعول
  [/^م(..)ي(.)$/, (m) => m[1] + m[2]], // مفعيل
  [/^مست(...)$/, (m) => m[1]], // مستفعل
  [/^م(.)ت(..)$/, (m) => m[1] + m[2]], // مفتعل
  [/^ا(.)ت(..)$/, (m) => m[1] + m[2]], // افتعل
  [/^ان(...)$/, (m) => m[1]], // انفعل
  [/^ت(.)ا(..)$/, (m) => m[1] + m[2]], // تفاعل
  [/^م(.)ا(..)$/, (m) => m[1] + m[2]], // مفاعل
  [/^م(...)$/, (m) => m[1]], // مفعل
  [/^ت(...)$/, (m) => m[1]], // تفعل / تفعيل(after ي removal)
  [/^ي(...)$/, (m) => m[1]], // يفعل (imperfect)
  [/^ن(...)$/, (m) => m[1]], // نفعل
  [/^ا(...)$/, (m) => m[1]], // أفعل / أفعُل (أتوب → توب) before the long-vowel patterns
  [/^(.)ا(..)$/, (m) => m[1] + m[2]], // فاعل
  [/^(..)ي(.)$/, (m) => m[1] + m[2]], // فعيل
  [/^(..)و(.)$/, (m) => m[1] + m[2]], // فعول
  [/^(..)ا(.)$/, (m) => m[1] + m[2]], // فعال
  [/^(...)ن$/, (m) => m[1]], // فعلن (الرحمن → رحمن)
];

/** Root of an already-stemmed form; returns the stem itself when no pattern applies. */
export function rootOfStem(st: string): string {
  let s = st;
  if (s.length <= 3) return s;
  for (let pass = 0; pass < 2 && s.length > 3; pass++) {
    const hit = PATTERNS.find(([re]) => re.test(s));
    if (!hit) break;
    s = hit[1](s.match(hit[0])!);
  }
  return s;
}

/**
 * Light root of a word (heuristic). Reads the word without one-letter prefixes first
 * (كتابة → كتب); if that leaves more than 4 letters, the prefix was a clitic (فاصبر → صبر).
 */
export function root(word: string): string {
  const r = rootOfStem(stem(word));
  if (r.length <= 4) return r;
  const alt = rootOfStem(stripSuffixes(stripPrefix(word, true), true));
  return alt.length < r.length ? alt : r;
}

/** Everything a word is indexed under: all candidate stems and their roots. */
export function keysOf(w: string): { stems: string[]; roots: string[] } {
  const stems = variants(w).map((v) => v.stem);
  return { stems, roots: [...new Set(stems.map(rootOfStem))] };
}

/** Tokens of a normalized string (2+ letters). */
export function words(normText: string): string[] {
  return normText.split(' ').filter((w) => w.length >= 2);
}

/** «ر ح م» (spaced letters) → «رحم», else null. */
export function spacedRoot(q: string): string | null {
  const n = fold(q);
  return /^(\S )+\S$/.test(n) && n.replace(/ /g, '').length >= 2 && n.replace(/ /g, '').length <= 4 ? n.replace(/ /g, '') : null;
}
