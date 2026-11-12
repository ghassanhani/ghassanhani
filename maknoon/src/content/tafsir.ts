import sample from '../../assets/content/tafsir-sample.json';
import { TAFSIRS, tafsirSource, type TafsirKey } from './sources';

type Row = { edition: string | null; stage: string | null; text: string; footnote: string | null };
const data = sample as { ayat: Record<string, Record<string, Row>> };

// Registry slug for each tafsir (Itqan) ↔ Ratq catalogue slug (sources.ts).
const REGISTRY: Record<TafsirKey, string> = {
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
  title: string; // from Ratq
  edition: string | null; // from the publisher file
  /** publisher's editorial stage: 'approved' = مرحلة الاعتماد, 'in-review' = المراجعة/الادخال, null = not stated */
  stage: 'approved' | 'in-review' | null;
  text: string; // verbatim
  footnote: string | null;
  attribution: string; // «مركز تفسير عبر رتق · CC BY-ND»
};

export function tafsirFor(surah: number, ayah: number): TafsirEntry[] {
  const rows = data.ayat[`${surah}:${ayah}`];
  if (!rows) return [];
  return ORDER.filter((k) => rows[REGISTRY[k]]).map((key) => {
    const r = rows[REGISTRY[key]];
    const src = tafsirSource(key);
    return {
      key,
      title: src.title,
      edition: r.edition ?? EDITION_FALLBACK[key] ?? null,
      stage: r.stage === 'مرحلة الاعتماد' ? 'approved' : r.stage ? 'in-review' : null,
      text: r.text,
      footnote: r.footnote,
      attribution: src.attribution,
    };
  });
}

export const TAFSIR_COUNT = Object.keys(TAFSIRS).length;
