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

export function normalize(s: string): string {
  return s
    .replace(/[ً-ٰٟۖ-ۭـࣰ-ࣿ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[ؤئء]/g, 'ا') // hamza on any seat → alef (consistent for index and query)
    .replace(/[^ء-ي\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const PREFIXES = ['وبال', 'وكال', 'فبال', 'وال', 'فال', 'بال', 'كال', 'لل', 'ال', 'وس', 'فس', 'و', 'ف', 'ب', 'ك', 'ل', 'س'];
const SUFFIXES = ['تموها', 'كموها', 'هما', 'كما', 'تما', 'تم', 'تن', 'هم', 'هن', 'كم', 'كن', 'نا', 'ها', 'ون', 'ين', 'ان', 'ات', 'وا', 'ه', 'ي', 'ك', 'ت', 'ا'];

/** Remove one clitic prefix and suffixes while keeping ≥3 letters. */
export function stem(w: string): string {
  let s = w;
  for (const p of PREFIXES) {
    // one-letter prefixes (و ف ب ك ل س) only when ≥4 letters remain: كبير ≠ ك+بير, وعد ≠ و+عد
    if (s.startsWith(p) && s.length - p.length >= (p.length === 1 ? 4 : 3)) {
      s = s.slice(p.length);
      break;
    }
  }
  for (let i = 0; i < 2; i++) {
    const suf = SUFFIXES.find((x) => s.endsWith(x) && s.length - x.length >= 3);
    if (!suf) break;
    s = s.slice(0, -suf.length);
  }
  return s;
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

/** Light triliteral root; returns the stem itself when no pattern applies. */
export function root(word: string): string {
  let s = stem(word);
  if (s.length <= 3) return s;
  for (let pass = 0; pass < 2 && s.length > 3; pass++) {
    const hit = PATTERNS.find(([re]) => re.test(s));
    if (!hit) break;
    s = hit[1](s.match(hit[0])!);
  }
  return s;
}

/** Tokens of a normalized string (2+ letters). */
export function words(normText: string): string[] {
  return normText.split(' ').filter((w) => w.length >= 2);
}

/** «ر ح م» (spaced letters) → «رحم», else null. */
export function spacedRoot(q: string): string | null {
  const n = normalize(q);
  return /^(\S )+\S$/.test(n) && n.replace(/ /g, '').length >= 2 && n.replace(/ /g, '').length <= 4 ? n.replace(/ /g, '') : null;
}
