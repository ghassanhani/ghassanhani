import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { Directory, File, FileMode, Paths } from 'expo-file-system';
import * as SQLite from 'expo-sqlite';
import manifestJson from '../../assets/packs/manifest.json';
import type { Node } from '@/assistant/corpus';
import { type Index, searchIndex } from '@/search/engine';
import { getPrefs, setPrefs } from '@/store/prefs';
import { utf8 } from './utf8';

/**
 * Offline tafsir packs (plan §7.4) — iOS/Android.
 * al-Mukhtasar ships inside the app as SQLite. The other four come straight from RATQ: the app
 * downloads the publisher's original CSV from RATQ's storage (`csv.url`), checks its SHA-256
 * against the manifest, and reads each passage in place through a byte index built and verified
 * by pipeline/importers/ratq/tafsir-index.mjs (every passage read back identical to the verified pack).
 */
export type PackInfo = {
  slug: string;
  ratq: string;
  title: string;
  license: string;
  publisher: string | null;
  rows: number;
  bytes: number;
  sha256: string;
  bundled: boolean;
  version: number;
  /** the original RATQ file this pack is read from on the phone */
  csv?: { url: string; version: string; bytes: number; sha256: string };
};
export type PackRow = { edition: string | null; stage: string | null; text: string; footnote: string | null };

export const packs = (manifestJson as { packs: PackInfo[] }).packs;
const rawBase = (Constants.expoConfig?.extra as { packsBaseUrl?: unknown } | undefined)?.packsBaseUrl;
const baseUrl = typeof rawBase === 'string' && /^https:\/\//.test(rawBase) ? rawBase : null;
export const packsDownloadable = !!baseUrl || packs.some((p) => p.csv);

// Byte indexes for the RATQ files (≈200 KB each), loaded when a passage is first read.
type CsvIndex = { editions: string[]; stages: string[]; rows: number[] };
const INDEX: Record<string, () => CsvIndex> = {
  'tafsir-alsaadi': () => require('../../assets/packs/tafsir-alsaadi.idx.json'),
  'tafsir-ibn-katheer': () => require('../../assets/packs/tafsir-ibn-katheer.idx.json'),
  'tafsir-albaghawi': () => require('../../assets/packs/tafsir-albaghawi.idx.json'),
  'tafsir-altabari': () => require('../../assets/packs/tafsir-altabari.idx.json'),
};
const lookups = new Map<string, { idx: CsvIndex; at: Map<string, number> }>();
const csvDir = () => new Directory(Paths.document, 'tafsir');
const csvFile = (slug: string) => new File(csvDir(), `${slug}.csv`);

function readCsvRow(slug: string, surah: number, ayah: number): PackRow | null {
  let l = lookups.get(slug);
  if (!l) {
    const idx = INDEX[slug]();
    const at = new Map<string, number>();
    for (let i = 0; i < idx.rows.length; i += 10) at.set(`${idx.rows[i]}:${idx.rows[i + 1]}`, i);
    l = { idx, at };
    lookups.set(slug, l);
  }
  const i = l.at.get(`${surah}:${ayah}`);
  if (i === undefined) return null;
  const r = l.idx.rows;
  const f = csvFile(slug);
  if (!f.exists) return null;
  const h = f.open(FileMode.ReadOnly);
  try {
    const cell = (start: number, length: number, quoted: number) => {
      if (!length) return null;
      h.offset = start;
      const t = utf8(h.readBytesSync(length));
      return quoted ? t.replace(/""/g, '"') : t;
    };
    return {
      text: cell(r[i + 2], r[i + 3], r[i + 4]) ?? '',
      footnote: cell(r[i + 5], r[i + 6], r[i + 7]),
      edition: r[i + 8] >= 0 ? l.idx.editions[r[i + 8]] : null,
      stage: r[i + 9] >= 0 ? l.idx.stages[r[i + 9]] : null,
    };
  } finally {
    h.close();
  }
}

const BUNDLED_ASSETS: Record<string, number> = {
  'tafsir-almokhtassar': require('../../assets/packs/tafsir-almokhtassar.db'),
};

const dbName = (slug: string) => `${slug}.v1.db`;
const open = new Map<string, Promise<SQLite.SQLiteDatabase>>();

export function isInstalled(slug: string) {
  const p = packs.find((x) => x.slug === slug);
  return !!p && (p.bundled || getPrefs().installedPacks.includes(slug));
}

function openPack(slug: string) {
  let db = open.get(slug);
  if (!db) {
    db = (async () => {
      const p = packs.find((x) => x.slug === slug);
      if (p?.bundled) await SQLite.importDatabaseFromAssetAsync(dbName(slug), { assetId: BUNDLED_ASSETS[slug] });
      return SQLite.openDatabaseAsync(dbName(slug), { useNewConnection: true });
    })();
    open.set(slug, db);
    db.catch(() => open.delete(slug));
  }
  return db;
}

/** Verbatim row for one ayah, or null when the pack isn't installed / has no entry. */
export async function readTafsir(slug: string, surah: number, ayah: number): Promise<PackRow | null> {
  if (!isInstalled(slug)) return null;
  if (packs.find((x) => x.slug === slug)?.csv) return readCsvRow(slug, surah, ayah);
  const db = await openPack(slug);
  return db.getFirstAsync<PackRow>('SELECT edition, stage, text, footnote FROM tafsir WHERE surah = ? AND ayah = ?', [surah, ayah]);
}

const toHex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');

/** Download, verify and register a pack. Throws on network/hash errors (nothing is kept). */
export async function downloadPack(slug: string) {
  const p = packs.find((x) => x.slug === slug);
  if (!p || p.bundled) return;
  if (p.csv) {
    // The publisher's file, straight from RATQ; kept only if it is byte-identical to the verified one.
    const dir = csvDir();
    if (!dir.exists) dir.create({ intermediates: true });
    const target = csvFile(slug);
    if (target.exists) target.delete();
    const file = await File.downloadFileAsync(p.csv.url, target);
    const hash = toHex(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, await file.bytes()));
    if (hash !== p.csv.sha256) {
      file.delete();
      throw new Error('Checksum mismatch');
    }
    lookups.delete(slug);
    setPrefs((s) => ({ installedPacks: Array.from(new Set([...s.installedPacks, slug])) }));
    return;
  }
  if (!baseUrl) throw new Error('packsBaseUrl is not configured');
  const dir = new Directory(SQLite.defaultDatabaseDirectory);
  if (!dir.exists) dir.create({ intermediates: true });
  const target = new File(dir, dbName(slug));
  if (target.exists) target.delete();
  const file = await File.downloadFileAsync(`${baseUrl.replace(/\/$/, '')}/${slug}.db`, target);
  const hash = toHex(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, await file.bytes()));
  if (hash !== p.sha256) {
    file.delete();
    throw new Error('Checksum mismatch');
  }
  setPrefs((s) => ({ installedPacks: Array.from(new Set([...s.installedPacks, slug])) }));
}

export async function removePack(slug: string) {
  const p = packs.find((x) => x.slug === slug);
  if (!p || p.bundled) return;
  const db = open.get(slug);
  open.delete(slug);
  if (db) await (await db).closeAsync().catch(() => {});
  const f = new File(new Directory(SQLite.defaultDatabaseDirectory), dbName(slug));
  if (f.exists) f.delete();
  const c = csvFile(slug);
  if (c.exists) c.delete();
  lookups.delete(slug);
  setPrefs((s) => ({ installedPacks: s.installedPacks.filter((x) => x !== slug) }));
}

export const packsSupported = true;

// ── Search the bundled al-Mukhtasar pack (root-aware BM25 index built by `npm run search:build`) ──

let mukhtasarIdx: Index | null = null;

/** Ranked al-Mukhtasar entries for a query (iOS/Android). Opens the passage via the ayah screen. */
export async function searchTafsirPack(query: string, limit: number): Promise<Node[]> {
  const p = packs.find((x) => x.slug === 'tafsir-almokhtassar');
  if (!p || !query.trim()) return [];
  mukhtasarIdx ??= require('../../assets/content/search-mukhtasar.json') as Index;
  const hits = searchIndex(mukhtasarIdx, query, limit);
  // each passage's own text, as published (shown as a short excerpt; the full text opens with the ayah)
  const rows = await Promise.all(hits.map((h) => readTafsir(p.slug, h.surah, h.ayah).catch(() => null)));
  return hits.map((h, i) => ({
    id: `tafsir:${p.slug}:${h.key}`,
    kind: 'tafsir' as const,
    title: p.title,
    ref: h.key,
    route: `/ayah/${h.key}`,
    tone: null,
    text: rows[i]?.text ?? undefined,
    norm: '',
    surah: h.surah,
    ayah: h.ayah,
  }));
}
