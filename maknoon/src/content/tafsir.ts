import { useEffect, useState } from 'react';
import { usePrefs } from '@/store/prefs';
import { isInstalled, readTafsir, type PackRow } from './packs';
import { TAFSIRS, tafsirSource, type TafsirKey } from './sources';

// Registry slug for each tafsir (Itqan) ↔ Ratq catalogue slug (sources.ts).
export const REGISTRY: Record<TafsirKey, string> = {
  ibnKathir: 'tafsir-ibn-katheer',
  tabari: 'tafsir-altabari',
  saadi: 'tafsir-alsaadi',
  baghawi: 'tafsir-albaghawi',
  mukhtasar: 'tafsir-almokhtassar',
};

/** Display order: Ibn Kathir first (as on the design), then the order of «التفاسير الخمسة». */
const ORDER: TafsirKey[] = ['ibnKathir', 'tabari', 'saadi', 'baghawi', 'mukhtasar'];

// Fallback edition labels for files that carry none (from Ratq / the design).
const EDITION_FALLBACK: Partial<Record<TafsirKey, string>> = { ibnKathir: 'دار ابن الجوزي' };

export type TafsirEntry = {
  key: TafsirKey;
  slug: string;
  title: string; // from Ratq
  attribution: string; // «مركز تفسير عبر رتق · CC BY-ND»
  installed: boolean;
  edition: string | null;
  /** publisher's editorial stage: 'approved' = مرحلة الاعتماد, 'in-review' = المراجعة/الادخال, null = not stated */
  stage: 'approved' | 'in-review' | null;
  text: string | null; // verbatim; null when not installed or no entry
  footnote: string | null;
};

function toEntry(key: TafsirKey, row: PackRow | null): TafsirEntry {
  const src = tafsirSource(key);
  return {
    key,
    slug: REGISTRY[key],
    title: src.title,
    attribution: src.attribution,
    installed: isInstalled(REGISTRY[key]),
    edition: row?.edition ?? EDITION_FALLBACK[key] ?? null,
    stage: row?.stage === 'مرحلة الاعتماد' ? 'approved' : row?.stage ? 'in-review' : null,
    text: row?.text ?? null,
    footnote: row?.footnote ?? null,
  };
}

/** All five tafsirs for one ayah; entries whose pack isn't installed come back with text = null. */
export function useTafsir(surah: number, ayah: number) {
  const [prefs] = usePrefs();
  const [entries, setEntries] = useState<TafsirEntry[] | null>(null);
  useEffect(() => {
    let alive = true;
    Promise.all(ORDER.map(async (k) => toEntry(k, await readTafsir(REGISTRY[k], surah, ayah).catch(() => null)))).then((e) => {
      if (alive) setEntries(e);
    });
    return () => {
      alive = false;
    };
  }, [surah, ayah, prefs.installedPacks]);
  return entries;
}

export const TAFSIR_COUNT = Object.keys(TAFSIRS).length;
