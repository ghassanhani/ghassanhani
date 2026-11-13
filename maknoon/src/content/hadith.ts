import { Asset } from 'expo-asset';
import { strFromU8, gunzipSync } from 'fflate';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Hadith from Sunnah.com (CC BY-NC-SA 4.0, credit «Sunnah.com»), built and verified by
 * pipeline/importers/sunnah: one compressed pack per book, bundled with the app, opened on demand.
 * The chain (sanad) and text (matn) are exactly as in the source; gradings are stored as given and
 * only their labels are put into Arabic for display (the original label is kept alongside).
 */
type BookMeta = { slug: string; name: string; count: number; graded: number; bytes: number; sha256: string; books: { no: string; name: string; count: number }[] };
export const hadithIndex = require('../../assets/content/hadith-index.json') as { _source: string; _license: string; _credit: string; books: BookMeta[] };

import type { Grade } from './hadithGrades';
export type { Grade } from './hadithGrades';
export type Hadith = { id: string; n: string; b: string; c: string; sanad: string; matn: string; g: Grade[]; url: string };
export type Pack = { slug: string; name: string; credit: string; license: string; books: Record<string, string>; chapters: Record<string, string>; hadith: Hadith[] };

const PACKS: Record<string, number> = {
  bukhari: require('../../hosted/hadith/bukhari.json.gz'),
  muslim: require('../../hosted/hadith/muslim.json.gz'),
  abudawud: require('../../hosted/hadith/abudawud.json.gz'),
  tirmidhi: require('../../hosted/hadith/tirmidhi.json.gz'),
  nasai: require('../../hosted/hadith/nasai.json.gz'),
  ibnmajah: require('../../hosted/hadith/ibnmajah.json.gz'),
  riyadussalihin: require('../../hosted/hadith/riyadussalihin.json.gz'),
  adab: require('../../hosted/hadith/adab.json.gz'),
  shamail: require('../../hosted/hadith/shamail.json.gz'),
  mishkat: require('../../hosted/hadith/mishkat.json.gz'),
  bulugh: require('../../hosted/hadith/bulugh.json.gz'),
};

const cache = new Map<string, Promise<Pack>>();
/** Opens one book's pack (decompressed once, then kept in memory). */
export function loadPack(slug: string): Promise<Pack> {
  let p = cache.get(slug);
  if (!p) {
    p = (async () => {
      const asset = Asset.fromModule(PACKS[slug]);
      await asset.downloadAsync();
      let buf: ArrayBuffer;
      if (Platform.OS === 'web') buf = await (await fetch(asset.uri)).arrayBuffer();
      else {
        const { File } = await import('expo-file-system');
        buf = await new File(asset.localUri ?? asset.uri).arrayBuffer();
      }
      return JSON.parse(strFromU8(gunzipSync(new Uint8Array(buf)))) as Pack;
    })();
    p.catch(() => cache.delete(slug));
    cache.set(slug, p);
  }
  return p;
}

/** A pack, loading it as needed. */
export function usePack(slug: string | undefined) {
  const [pack, setPack] = useState<Pack | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!slug || !PACKS[slug]) return;
    let live = true;
    loadPack(slug)
      .then((p) => live && setPack(p))
      .catch(() => live && setError(true));
    return () => {
      live = false;
    };
  }, [slug]);
  return { pack: pack && pack.slug === slug ? pack : null, error };
}

export const bookMeta = (slug: string) => hadithIndex.books.find((b) => b.slug === slug);

/** «bukhari:1» → its book and the hadith (once the pack is open). */
export function useHadith(id: string | undefined) {
  const [slug, num] = (id ?? '').split(':');
  const { pack, error } = usePack(slug);
  const h = pack?.hadith.find((x) => x.id === num) ?? null;
  return { pack, hadith: h, error: error || (!!pack && !h) };
}

export { gradeLabel, gradeTone, graderName, type GradeTone } from './hadithGrades';

/** «صحيح البخاري ١» style reference. */
export const hadithRef = (pack: Pack | BookMeta | undefined, h: Hadith) => `${pack?.name ?? ''} ${toArabicDigits(h.n)}`;
const toArabicDigits = (s: string) => s.replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);
