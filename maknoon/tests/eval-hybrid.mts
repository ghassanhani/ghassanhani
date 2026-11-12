// SPEC M12: top-5 hit rate of word search alone vs word + meaning search.
// Needs the network (asks the Maknoon Worker to embed each test query), so it is run by hand:
//   npm run search:eval
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cosineTop, fuse, searchIndex } from '../src/search/core.ts';
import { ROOT, quranIndex, readJson, top5, type TestSet } from './helpers.mts';

const worker = (readJson<{ expo: { extra: { searchWorkerUrl: string } } }>('app.json').expo.extra.searchWorkerUrl ?? '').replace(/\/$/, '');
const meta = readJson<{ model: string; dims: number; count: number; keys: string[] }>('assets/content/embeddings-ayat.json');
const buf = readFileSync(join(ROOT, 'assets/content/embeddings-ayat.bin'));
const n = meta.count * meta.dims;
const q8 = new Int8Array(buf.buffer, buf.byteOffset, n);
const scale = new Float32Array(buf.buffer.slice(buf.byteOffset + n, buf.byteOffset + n + meta.count * 4));
const { idx, phrases } = quranIndex();
const set = readJson<TestSet>('tests/search-testset.json');

const lexical = (q: string) => searchIndex(idx, q, 20, phrases);
const meaning = new Map<string, ReturnType<typeof lexical>>();
for (const t of set.queries) {
  const res = await fetch(`${worker}/embed`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: t.q }) });
  if (!res.ok) throw new Error(`embed failed: HTTP ${res.status}`);
  const { vector, model } = (await res.json()) as { vector: number[]; model: string };
  if (model !== meta.model) throw new Error(`Worker model ${model} ≠ bundled vectors ${meta.model}`);
  const norm = Math.hypot(...vector) || 1;
  meaning.set(t.q, cosineTop(q8, scale, meta.dims, meta.keys, Float32Array.from(vector, (x) => x / norm), 20));
}

const report = (name: string, rank: (q: string) => string[]) => {
  const r = top5(set, rank);
  console.log(`${name.padEnd(16)} ${r.hits}/${r.total} = ${((r.hits / r.total) * 100).toFixed(0)}%${r.misses.length ? `   misses: ${r.misses.join(' · ')}` : ''}`);
  return r.hits / r.total;
};
const lex = report('words (M2)', (q) => lexical(q).map((h) => h.key));
report('meaning only', (q) => meaning.get(q)!.map((h) => h.key));
const hyb = report('words + meaning', (q) => fuse(lexical(q), meaning.get(q)!, 5).map((h) => h.key));
console.log(hyb > lex ? 'M12 criterion met: hybrid beats word search.' : 'M12 criterion NOT met.');
