import { fold, keysOf, root, rootOfStem, spacedRoot, variants } from './arabic.ts';

/**
 * Pure search core (SPEC §5): root-aware BM25, reciprocal-rank fusion and cosine
 * ranking. No assets, no React — the app binds it to its indexes in engine.ts and
 * the tests (tests/*.test.mts) run it directly under Node.
 */
// Particles / question words that carry no topic (normalized spellings).
const STOP = new Set(
  'ما ماذا من هل كيف لماذا متى اين اي في علي عن الي ان او ثم قد لا لم لن هو هي هم انا انت نحن هذا هذه ذلك التي الذي الذين كان يكون مع عند بعد قبل كل بين حتي اذا لي لنا عليه فيه به له الاحاديث احاديث حديث الايات ايات ايه القران ورد يجوز يجب حكم فضل معني'.split(' '),
);

/** Topic terms of a query: folded words without stop-words (the article is ignored for the check). */
export function terms(q: string): string[] {
  return fold(q)
    .split(' ')
    .filter((w) => w.length >= 2 && !STOP.has(w) && !STOP.has(w.replace(/^(و|ف|ب|ل)?ال/, '')));
}

const K1 = 1.2;
const B = 0.75;

export type Index = { keys: string[]; len: number[]; avg: number; roots: Record<string, number[]>; stems: Record<string, number[]>; forms: Record<string, string[]> };
export type Hit = { key: string; surah: number; ayah: number; score: number };

function bm25(idx: Index, postings: number[] | undefined, scores: Float32Array, weight: number, seen?: Uint8Array) {
  if (!postings) return;
  const n = idx.keys.length;
  const df = postings.length / 2;
  const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5));
  for (let i = 0; i < postings.length; i += 2) {
    const d = postings[i];
    const tf = postings[i + 1];
    scores[d] += weight * idf * ((tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * idx.len[d]) / idx.avg)));
    if (seen) seen[d] = 1;
  }
}

/**
 * Root/stem BM25 over any index built by scripts/build-search.mts. Documents containing
 * most query terms come first; if none do, falls back to plain ranking (rarer term wins).
 */
export function searchIndex(idx: Index, query: string, limit: number, phraseTexts?: string[]): Hit[] {
  const n = idx.keys.length;
  const scores = new Float32Array(n);
  const have = new Uint8Array(n);
  const sr = spacedRoot(query);
  const ts = sr ? [] : terms(query);
  if (sr) bm25(idx, idx.roots[sr], scores, 1);
  for (const t of ts) {
    const seen = new Uint8Array(n);
    // Every reading of the word counts; one that drops a one-letter prefix counts less in a typed query.
    const stemW = new Map<string, number>();
    const rootW = new Map<string, number>();
    for (const v of variants(t)) {
      const w = v.clitic ? 0.4 : 1;
      stemW.set(v.stem, Math.max(stemW.get(v.stem) ?? 0, w));
      const r = rootOfStem(v.stem);
      rootW.set(r, Math.max(rootW.get(r) ?? 0, w));
    }
    for (const [r, w] of rootW) bm25(idx, idx.roots[r], scores, w, seen);
    for (const [st, w] of stemW) bm25(idx, idx.stems[st], scores, 0.6 * w, seen);
    for (let i = 0; i < n; i++) have[i] += seen[i];
  }
  const phrase = fold(query);
  if (phraseTexts && !sr && phrase.includes(' ')) phraseTexts.forEach((p, i) => p.includes(phrase) && (scores[i] += 10));

  const collect = (need: number) => {
    const out: Hit[] = [];
    for (let i = 0; i < n; i++) {
      if (scores[i] <= 0 || (ts.length > 1 && have[i] < need)) continue;
      const [s, a] = idx.keys[i].split(':').map(Number);
      out.push({ key: idx.keys[i], surah: s, ayah: a, score: scores[i] });
    }
    return out;
  };
  let hits = collect(Math.max(1, Math.ceil(ts.length * 0.6)));
  if (!hits.length && ts.length > 1) hits = collect(1);
  return hits.sort((x, y) => y.score - x.score || x.surah - y.surah || x.ayah - y.ayah).slice(0, limit);
}

/** Does normalized text mention the query's terms (root/stem-aware)? Returns how many terms match. */
export function matchCount(normText: string, query: string): number {
  const ts = terms(query);
  if (!ts.length) return 0;
  const words = normText.split(' ').map(keysOf);
  const wr = new Set(words.flatMap((k) => k.roots));
  const ws = new Set(words.flatMap((k) => k.stems));
  return ts.filter((t) => {
    const k = keysOf(t);
    return k.roots.some((r) => wr.has(r)) || k.stems.some((st) => ws.has(st)) || normText.includes(t);
  }).length;
}

/** Root card data for a one-word (or spaced «ر ح م») query against an index. */
export function rootInfoIn(idx: Index, query: string): { root: string; letters: string; ayat: number; forms: string[] } | null {
  const sr = spacedRoot(query);
  const ts = sr ? [sr] : terms(query);
  if (ts.length !== 1) return null;
  const r = sr ?? root(ts[0]);
  const postings = idx.roots[r];
  if (!postings) return null;
  return { root: r, letters: r.split('').join(' '), ayat: postings.length / 2, forms: idx.forms[r] ?? [] };
}

/**
 * Reciprocal rank fusion (k = 60) of word-based and meaning-based rankings —
 * items found by both rise to the top; either list alone still works.
 */
export function fuse<T extends { key: string }>(lexical: T[], semantic: T[], limit = 30): (T & { via: 'both' | 'words' | 'meaning' })[] {
  const score = new Map<string, number>();
  const item = new Map<string, T>();
  const from = new Map<string, Set<string>>();
  const add = (list: T[], tag: string) =>
    list.forEach((h, r) => {
      score.set(h.key, (score.get(h.key) ?? 0) + 1 / (60 + r + 1));
      if (!item.has(h.key)) item.set(h.key, h);
      (from.get(h.key) ?? from.set(h.key, new Set()).get(h.key)!).add(tag);
    });
  add(lexical, 'words');
  add(semantic, 'meaning');
  return [...score.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => {
      const f = from.get(k)!;
      return { ...item.get(k)!, via: f.size === 2 ? 'both' : f.has('words') ? 'words' : 'meaning' } as T & { via: 'both' | 'words' | 'meaning' };
    });
}

/** Top documents by cosine against int8 vectors with a per-document scale (see scripts/build-embeddings.mjs). */
export function cosineTop(q: Int8Array, scale: Float32Array, dims: number, keys: string[], vec: Float32Array, limit: number): Hit[] {
  const n = keys.length;
  const scores = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let d = 0;
    const o = i * dims;
    for (let k = 0; k < dims; k++) d += q[o + k] * vec[k];
    scores[i] = d * scale[i];
  }
  return Array.from(scores.keys())
    .sort((a, b) => scores[b] - scores[a])
    .slice(0, limit)
    .map((i) => {
      const [s, a] = keys[i].split(':').map(Number);
      return { key: keys[i], surah: s, ayah: a, score: scores[i] };
    });
}
