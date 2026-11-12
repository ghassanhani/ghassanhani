import Constants from 'expo-constants';
import { Asset } from 'expo-asset';
import { Platform } from 'react-native';
import meta from '../../assets/content/embeddings-ayat.json';
import { getPrefs } from '@/store/prefs';
import { cosineTop, type Hit } from './core';

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

const M = meta as { model: string; dims: number; count: number; keys: string[] };
let vectors: Promise<{ q: Int8Array; scale: Float32Array } | null> | null = null;

async function loadVectors() {
  vectors ??= (async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- Metro asset reference
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
    const { vector, model } = (await res.json()) as { vector: number[]; model?: string };
    // The bundled ayah vectors only match phrases embedded by the same model.
    if (model !== M.model || vector.length !== M.dims) return null;
    const norm = Math.hypot(...vector) || 1;
    const v = Float32Array.from(vector, (x) => x / norm);
    if (cache.size > 200) cache.clear();
    cache.set(key, v);
    return v;
  } catch {
    return null;
  }
}

export type SemanticHit = Hit;
export { fuse } from './core';

/** Top ayat by meaning (cosine), or [] when unavailable or switched off in Settings. */
export async function searchByMeaning(query: string, limit = 30): Promise<SemanticHit[]> {
  if (!WORKER || !getPrefs().meaningSearch || query.trim().length < 2) return [];
  const [vec, data] = await Promise.all([embedQuery(query), loadVectors()]);
  if (!vec || !data) return [];
  return cosineTop(data.q, data.scale, M.dims, M.keys, vec, limit);
}
