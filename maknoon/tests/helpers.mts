import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fold } from '../src/search/arabic.ts';
import type { Index } from '../src/search/core.ts';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const readJson = <T,>(rel: string): T => JSON.parse(readFileSync(join(ROOT, rel), 'utf8')) as T;

/** The app's Quran index and its phrase texts, loaded the way engine.ts binds them. */
export function quranIndex() {
  const idx = readJson<Index>('assets/content/search-quran.json');
  const plain = readJson<Record<string, string>>('assets/content/quran-search.json');
  return { idx, phrases: idx.keys.map((k) => fold(plain[k])) };
}

export type TestSet = { queries: { q: string; expect: string[] }[] };
/** Share of queries with an expected node in the top 5 of `rank(q)`. */
export function top5(set: TestSet, rank: (q: string) => string[]) {
  const misses: string[] = [];
  for (const t of set.queries) if (!rank(t.q).slice(0, 5).some((k) => t.expect.includes(k))) misses.push(t.q);
  return { hits: set.queries.length - misses.length, total: set.queries.length, misses };
}
