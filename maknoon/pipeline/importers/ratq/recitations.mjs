#!/usr/bin/env node
// Recitations from RATQ (api.cms.itqan.dev): every complete Hafs ʿan ʿĀṣim recitation (the app's
// Quran text is Hafs), with one audio file per surah on RATQ's storage and the start/end of every
// ayah inside it. The app bundles the timings and streams the audio from RATQ.
//
//   NODE_USE_ENV_PROXY=1 node pipeline/importers/ratq/recitations.mjs
//
// Verification per recitation before it is kept (a recitation that fails is left out, never patched):
//   · 114 surah files, numbered 1..114, each an https URL on storage.cms.itqan.dev
// Its ayah timings are kept only when complete and sound (otherwise `t` is null and the app plays
// whole surahs only, never a guessed ayah position):
//   · timings for exactly the Quran's 6,236 ayah keys, in mushaf order, inside their own surah's file
//   · every ayah has end > start, and ayat do not run backwards inside a surah
//   · licence and publisher read from the RATQ catalogue (cms-<id>), never typed
import { createHash } from 'node:crypto';
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const API = process.env.ITQAN_REGISTRY_URL ?? 'https://api.cms.itqan.dev';
const hafs = JSON.parse(readFileSync(join(root, 'assets/content/quran-hafs.json'), 'utf8')).ayat;
const keys = Object.keys(hafs);
const catalog = JSON.parse(readFileSync(join(root, 'assets/content/ratq-catalog.json'), 'utf8')).resources;

const get = async (url) => {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(url);
    if (r.ok) return r.json();
    await new Promise((s) => setTimeout(s, 1000 * 2 ** i));
  }
  throw new Error(`GET ${url} failed`);
};

const list = (await get(`${API}/recitations/?page_size=200`)).results;
const hafsOnes = list.filter((x) => x.riwayah?.name === 'Hafs an Aasim' && x.surahs_count === 114);

const kept = [];
const dropped = [];
for (const r of hafsOnes) {
  const surahs = [];
  for (let page = 1; surahs.length < 114 && page < 20; page++) {
    const d = await get(`${API}/recitations/${r.id}/?page=${page}&page_size=200`);
    surahs.push(...d.results);
    if (!d.next) break;
  }
  const why = [];
  const timingWhy = [];
  surahs.sort((a, b) => a.surah_number - b.surah_number);
  if (surahs.length !== 114 || surahs.some((s, i) => s.surah_number !== i + 1)) why.push(`${surahs.length} surah files`);
  if (surahs.some((s) => !/^https:\/\/storage\.cms\.itqan\.dev\//.test(s.audio_url ?? ''))) why.push('audio not on RATQ storage');
  const times = [];
  const seen = [];
  for (const s of surahs) {
    let last = -1;
    for (const t of s.ayahs_timings ?? []) {
      seen.push(t.ayah_key);
      if (Number(t.ayah_key.split(':')[0]) !== s.surah_number) timingWhy.push(`${t.ayah_key} in surah ${s.surah_number}'s file`);
      if (!(t.end_ms > t.start_ms) || t.start_ms < last) timingWhy.push(`${t.ayah_key}: timing`);
      last = t.start_ms;
      times.push(t.start_ms, t.end_ms);
    }
  }
  if (seen.length !== keys.length || seen.some((k, i) => k !== keys[i])) timingWhy.push(`timings for ${seen.length} of 6,236 ayat`);
  const cat = catalog.find((c) => c.slug === `cms-${r.id}`);
  if (!cat) why.push('not in the RATQ catalogue');
  if (why.length) {
    dropped.push(`${r.id} ${r.reciter?.name}: ${[...new Set(why)].slice(0, 3).join('; ')}`);
    continue;
  }
  kept.push({
    id: r.id,
    ratq: cat.slug,
    name: cat.name_ar,
    reciter: r.reciter?.name ?? null,
    publisher: cat.publisher?.name_ar ?? r.publisher?.name ?? null,
    license: cat.license,
    folder: (r.folders ?? []).find((f) => f.is_default)?.slug ?? 'default',
    bytes: surahs.reduce((n, s) => n + (s.size_bytes ?? 0), 0),
    urls: surahs.map((s) => s.audio_url),
    // [start_ms, end_ms] for every ayah, in mushaf order (index = ayah number − 1); null = whole surahs only
    t: timingWhy.length ? null : times,
  });
  process.stdout.write(`✓ ${r.id} ${cat.name_ar}${timingWhy.length ? ` · whole surahs only (${timingWhy[0]})` : ' · ayah timings'}\n`);
}

const out = join(root, 'assets/content/recitations.json');
const body = { _source: 'RATQ recitations (api.cms.itqan.dev), Hafs ʿan ʿĀṣim, complete', _fetched: new Date().toISOString().slice(0, 10), recitations: kept };
const json = JSON.stringify(body);
writeFileSync(`${out}.tmp`, json);
renameSync(`${out}.tmp`, out);
console.log(`\n${kept.length} recitations verified (${kept.filter((k) => k.t).length} with ayah timings) and written (${(json.length / 1e6).toFixed(1)} MB) · sha256 ${createHash('sha256').update(json).digest('hex').slice(0, 16)}…`);
if (dropped.length) console.log(`Left out (${dropped.length}):\n  ${dropped.join('\n  ')}`);
