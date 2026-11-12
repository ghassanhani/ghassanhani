import index from '../../assets/content/search-quran.json';
import plain from '../../assets/content/quran-search.json';
import { normalize, root, spacedRoot, stem } from './arabic';

/**
 * Smart search, fully on-device (plan §7.3): root-aware BM25 over all 6,236 ayat.
 * «رحم» finds رحمة · الرحيم · يرحم · الرحمن; tashkeel and hamza forms are ignored;
 * an exact phrase match ranks first. No network, no model.
 */
type Index = { keys: string[]; len: number[]; avg: number; roots: Record<string, number[]>; stems: Record<string, number[]>; forms: Record<string, string[]> };
const IDX = index as unknown as Index;
const PLAIN = plain as Record<string, string>;
const N = IDX.keys.length;
const normPlain: string[] = IDX.keys.map((k) => normalize(PLAIN[k]));

// Particles / question words that carry no topic (normalized spellings).
const STOP = new Set(
  'ما ماذا من هل كيف لماذا متى اين اي في علي عن الي ان او ثم قد لا لم لن هو هي هم انا انت نحن هذا هذه ذلك التي الذي الذين كان يكون مع عند بعد قبل كل بين حتي اذا لي لنا عليه فيه به له الاحاديث احاديث حديث الايات ايات ايه القران ورد يجوز يجب حكم فضل معني'.split(' '),
);

/** Topic terms of a query: normalized words without stop-words. */
export function terms(q: string): string[] {
  return normalize(q)
    .split(' ')
    .filter((w) => w.length >= 2 && !STOP.has(w) && !STOP.has(stem(w)));
}

const K1 = 1.2;
const B = 0.75;
function bm25(postings: number[] | undefined, scores: Float32Array, weight: number) {
  if (!postings) return;
  const df = postings.length / 2;
  const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
  for (let i = 0; i < postings.length; i += 2) {
    const d = postings[i];
    const tf = postings[i + 1];
    scores[d] += weight * idf * ((tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * IDX.len[d]) / IDX.avg)));
  }
}

export type AyahHit = { key: string; surah: number; ayah: number; score: number };

export function searchQuran(query: string, limit = 20): AyahHit[] {
  const scores = new Float32Array(N);
  const sr = spacedRoot(query);
  const ts = sr ? [] : terms(query);
  if (sr) bm25(IDX.roots[sr], scores, 1);
  for (const t of ts) {
    bm25(IDX.roots[root(t)], scores, 1);
    bm25(IDX.stems[stem(t)], scores, 0.6);
  }
  // Exact phrase (2+ words) → strong boost.
  const phrase = normalize(query);
  if (!sr && phrase.includes(' ')) normPlain.forEach((p, i) => p.includes(phrase) && (scores[i] += 10));

  // Prefer ayat containing most query terms (by root or stem); if none do, fall back to
  // pure BM25 ranking, which favours the rarer, more meaningful term («فضل الصبر» → صبر).
  const collect = (need: number) => {
    const hits: AyahHit[] = [];
    for (let i = 0; i < N; i++) {
      if (scores[i] <= 0) continue;
      if (need > 1) {
        const words = normPlain[i].split(' ');
        const have = ts.filter((t) => words.some((w) => root(w) === root(t) || stem(w) === stem(t))).length;
        if (have < need) continue;
      }
      const [s, a] = IDX.keys[i].split(':').map(Number);
      hits.push({ key: IDX.keys[i], surah: s, ayah: a, score: scores[i] });
    }
    return hits;
  };
  let hits = collect(Math.max(1, Math.ceil(ts.length * 0.6)));
  if (!hits.length && ts.length > 1) hits = collect(1);
  return hits.sort((x, y) => y.score - x.score || x.surah - y.surah || x.ayah - y.ayah).slice(0, limit);
}

/** Root card for a one-word (or spaced «ر ح م») query: the root, how many ayat, and its derived words. */
export function rootInfo(query: string): { root: string; letters: string; ayat: number; forms: string[] } | null {
  const sr = spacedRoot(query);
  const ts = sr ? [sr] : terms(query);
  if (ts.length !== 1) return null;
  const r = sr ?? root(ts[0]);
  const postings = IDX.roots[r];
  if (!postings) return null;
  return { root: r, letters: r.split('').join(' '), ayat: postings.length / 2, forms: IDX.forms[r] ?? [] };
}

/** Does normalized text mention the query's terms (root/stem-aware)? Returns how many terms match. */
export function matchCount(normText: string, query: string): number {
  const ts = terms(query);
  if (!ts.length) return 0;
  const words = normText.split(' ');
  const wr = new Set(words.map(root));
  const ws = new Set(words.map(stem));
  return ts.filter((t) => wr.has(root(t)) || ws.has(stem(t)) || normText.includes(t)).length;
}
