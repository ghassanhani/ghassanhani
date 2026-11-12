import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { Directory, File } from 'expo-file-system';
import * as SQLite from 'expo-sqlite';
import manifestJson from '../../assets/packs/manifest.json';
import { getPrefs, setPrefs } from '@/store/prefs';

/**
 * Offline tafsir packs (plan §7.4) — iOS/Android.
 * One SQLite file per tafsir, built by `npm run packs:build`. al-Mukhtasar ships
 * inside the app; the others download from `expo.extra.packsBaseUrl` (app.json),
 * are verified against the manifest's SHA-256, then opened read-only.
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
};
export type PackRow = { edition: string | null; stage: string | null; text: string; footnote: string | null };

export const packs = (manifestJson as { packs: PackInfo[] }).packs;
const rawBase = (Constants.expoConfig?.extra as { packsBaseUrl?: unknown } | undefined)?.packsBaseUrl;
const baseUrl = typeof rawBase === 'string' && /^https:\/\//.test(rawBase) ? rawBase : null;
export const packsDownloadable = !!baseUrl;

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
  const db = await openPack(slug);
  return db.getFirstAsync<PackRow>('SELECT edition, stage, text, footnote FROM tafsir WHERE surah = ? AND ayah = ?', [surah, ayah]);
}

const toHex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');

/** Download, verify and register a pack. Throws on network/hash errors (nothing is kept). */
export async function downloadPack(slug: string) {
  const p = packs.find((x) => x.slug === slug);
  if (!p || p.bundled) return;
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
  setPrefs((s) => ({ installedPacks: s.installedPacks.filter((x) => x !== slug) }));
}

export const packsSupported = true;

// ── Assistant support: search the bundled al-Mukhtasar pack (normalized, cached in memory) ──
import type { Node } from '@/assistant/corpus';

let mukhtasarIndex: Promise<{ s: number; a: number; norm: string }[]> | null = null;
const norm = (t: string) =>
  t
    .replace(/[ً-ٰٟۖ-ۭـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي');

export async function searchTafsirPack(toks: string[], need: number, limit: number): Promise<Node[]> {
  const slug = 'tafsir-almokhtassar';
  const p = packs.find((x) => x.slug === slug);
  if (!p || !toks.length) return [];
  mukhtasarIndex ??= openPack(slug)
    .then((db) => db.getAllAsync<{ surah: number; ayah: number; text: string }>('SELECT surah, ayah, text FROM tafsir'))
    .then((rows) => rows.map((r) => ({ s: r.surah, a: r.ayah, norm: norm(r.text) })));
  const rows = await mukhtasarIndex;
  return rows
    .map((r) => ({ r, hits: toks.filter((t) => r.norm.includes(t)).length }))
    .filter((x) => x.hits >= need)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, limit)
    .map(({ r }) => ({
      id: `tafsir:${slug}:${r.s}:${r.a}`,
      kind: 'tafsir' as const,
      title: p.title,
      ref: `${r.s}:${r.a}`,
      route: `/ayah/${r.s}:${r.a}`,
      tone: null,
      norm: r.norm,
      surah: r.s,
      ayah: r.a,
    }));
}
