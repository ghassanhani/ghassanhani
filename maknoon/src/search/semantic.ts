import Constants from 'expo-constants';
import { Asset } from 'expo-asset';
import { Platform } from 'react-native';
import meta from '../../assets/content/embeddings-ayat.json';

/**
 * Meaning-based search (plan §7.3). Ayah vectors (BGE-M3 over ayah + al-Mukhtasar,
 * int8, 6.4 MB) ship inside the app; only the search phrase goes to the Maknoon
 * Worker (Cloudflare Workers AI, zero data retention, no logging) to become a vector.
 * Matching happens on the device. Any failure (offline, quota) → [] and the
 * root-aware search carries on alone.
 */
const raw = (Constants.expoConfig?.extra as { searchWorkerUrl?: unknown } | undefined)?.searchWorkerUrl;
const WORKER = typeof raw === 'string' && /^https:\/\//.test(raw) ? raw.replace(/\/$/, '') : null;
export const semanticEnabled = WORKER !== null;

const M = meta as { dims: number; count: number; keys: string[] };
let vectors: Promise<{ q: Int8Array; scale: Float32Array } | null> | null = null;

async function loadVectors() {
  vectors ??= (async () => {
    try {
      const [asset] = await Asset.loadAsync(require('../../assets/content/embeddings-ayat.bin'));
      const uri = asset.localUri ?? asset.uri;
      let buf: ArrayBuffer;
      if (Platform.OS === 'web') buf = await (await fetch(uri)).arrayBuffer();
      else {
        const { File } = await import('expo-file-system');
        buf = (await new File(uri).bytes()).buffer as ArrayBuffer;
      }
      const n = M.count * M.dims;
      return { q: new Int8Array(buf, 0, n), scale: new Float32Array(buf.slice(n, n + M.count * 4)) };
    } catch {
      return null;
    }
  })();
  return vectors;
}

const cache = new Map<string, Float32Array>();
async function embedQuery(text: string): Promise<Float32Array | null> {
  const key = text.trim();
  if (cache.has(key)) return cache.get(key)!;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(`${WORKER}/embed`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: key }), signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const { vector } = (await res.json()) as { vector: number[] };
    const norm = Math.hypot(...vector) || 1;
    const v = Float32Array.from(vector, (x) => x / norm);
    if (cache.size > 200) cache.clear();
    cache.set(key, v);
    return v;
  } catch {
    return null;
  }
}

export type SemanticHit = { key: string; surah: number; ayah: number; score: number };

/** Top ayat by meaning (cosine), or [] when unavailable. */
export async function searchByMeaning(query: string, limit = 30): Promise<SemanticHit[]> {
  if (!WORKER || query.trim().length < 2) return [];
  const [vec, data] = await Promise.all([embedQuery(query), loadVectors()]);
  if (!vec || !data) return [];
  const { q, scale } = data;
  const D = M.dims;
  const scores = new Float32Array(M.count);
  for (let i = 0; i < M.count; i++) {
    let d = 0;
    const o = i * D;
    for (let k = 0; k < D; k++) d += q[o + k] * vec[k];
    scores[i] = d * scale[i];
  }
  const idx = Array.from(scores.keys()).sort((a, b) => scores[b] - scores[a]).slice(0, limit);
  return idx.map((i) => {
    const [s, a] = M.keys[i].split(':').map(Number);
    return { key: M.keys[i], surah: s, ayah: a, score: scores[i] };
  });
}

/**
 * Reciprocal rank fusion (k = 60) of word-based and meaning-based rankings —
 * ayat found by both rise to the top; either list alone still works.
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
