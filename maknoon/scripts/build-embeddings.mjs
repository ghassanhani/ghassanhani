#!/usr/bin/env node
// Meaning vectors for all 6,236 ayat (plan §7.3 semantic search), via your Maknoon Worker
// (Cloudflare Workers AI, @cf/baai/bge-m3, zero data retention).
//
// Each ayah is embedded together with its al-Mukhtasar explanation (plain modern Arabic
// helps everyday questions match). Vectors are L2-normalised and quantised to int8 with a
// per-ayah scale:
//   assets/content/embeddings-ayat.bin   Int8[count*dims] then Float32[count] scales
//   assets/content/embeddings-ayat.json  { model, dims, count, keys }  (keys = search index order)
//
// Usage:  MAKNOON_WORKER=https://… MAKNOON_BUILD_TOKEN=… npm run embeddings:build
import { readFileSync, writeFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const WORKER = process.env.MAKNOON_WORKER;
const TOKEN = process.env.MAKNOON_BUILD_TOKEN;
if (!WORKER || !TOKEN) throw new Error('Set MAKNOON_WORKER and MAKNOON_BUILD_TOKEN');

const plain = JSON.parse(readFileSync(join(root, 'assets/content/quran-search.json'), 'utf8'));
const keys = JSON.parse(readFileSync(join(root, 'assets/content/search-quran.json'), 'utf8')).keys;
const db = new DatabaseSync(join(root, 'assets/packs/tafsir-almokhtassar.db'), { readOnly: true });
const getT = db.prepare('SELECT text FROM tafsir WHERE surah = ? AND ayah = ?');

const strip = (t) => t.replace(/[_¬¥{}]/g, '').replace(/\s+/g, ' ').trim();
const texts = keys.map((k) => {
  const [s, a] = k.split(':').map(Number);
  const tafsir = getT.get(s, a)?.text ?? '';
  return `${plain[k]}\n${strip(tafsir)}`.slice(0, 1500);
});

const DIMS = 1024;
const q = new Int8Array(keys.length * DIMS);
const scales = new Float32Array(keys.length);
const BATCH = 50;
for (let i = 0; i < texts.length; i += BATCH) {
  let res;
  for (let attempt = 1; ; attempt++) {
    res = await fetch(`${WORKER.replace(/\/$/, '')}/embed-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ texts: texts.slice(i, i + BATCH) }),
    });
    if (res.ok) break;
    if (attempt >= 4) throw new Error(`batch ${i}: HTTP ${res.status} ${await res.text()}`);
    await new Promise((r) => setTimeout(r, 3000 * attempt));
  }
  const { vectors } = await res.json();
  vectors.forEach((v, j) => {
    const n = Math.hypot(...v) || 1;
    let max = 0;
    for (const x of v) max = Math.max(max, Math.abs(x / n));
    const scale = max / 127 || 1;
    scales[i + j] = scale;
    for (let d = 0; d < DIMS; d++) q[(i + j) * DIMS + d] = Math.round(v[d] / n / scale);
  });
  process.stdout.write(`\r${Math.min(i + BATCH, texts.length)}/${texts.length}`);
}
const out = Buffer.concat([Buffer.from(q.buffer), Buffer.from(scales.buffer)]);
writeFileSync(join(root, 'assets/content/embeddings-ayat.bin'), out);
writeFileSync(join(root, 'assets/content/embeddings-ayat.json'), JSON.stringify({ model: '@cf/baai/bge-m3', dims: DIMS, count: keys.length, text: 'ayah (KFGQPC plain) + al-Mukhtasar', keys }));
console.log(`\nWrote ${(out.length / 1e6).toFixed(1)} MB`);
