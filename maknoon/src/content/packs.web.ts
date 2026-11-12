import manifestJson from '../../assets/packs/manifest.json';
import sample from '../../assets/content/tafsir-sample.json';
import type { PackInfo, PackRow } from './packs';

/**
 * Web build: SQLite on web is still experimental in Expo, so the web reader
 * serves only the bundled sample ayat; full packs are a native feature.
 */
export type { PackInfo, PackRow } from './packs';
export const packs = (manifestJson as { packs: PackInfo[] }).packs;
export const packsDownloadable = false;
export const packsSupported = false;

const rows = (sample as { ayat: Record<string, Record<string, PackRow>> }).ayat;

export function isInstalled(slug: string) {
  return Object.values(rows).some((r) => slug in r);
}

export async function readTafsir(slug: string, surah: number, ayah: number): Promise<PackRow | null> {
  return rows[`${surah}:${ayah}`]?.[slug] ?? null;
}

export async function downloadPack() {
  throw new Error('Packs are available in the iOS/Android app');
}

export async function removePack() {}

export async function searchTafsirPack(_query: string, _limit: number): Promise<never[]> {
  return []; // web build: no SQLite packs
}
