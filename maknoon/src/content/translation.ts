/**
 * Translations of the meanings, verbatim from RATQ (built by pipeline/importers/ratq/translation.mjs).
 * French: Rachid Maach (IslamHouse, via QuranEnc), RATQ cms-10, CC BY-ND — SPEC §4 cleared.
 */
type Data = { _source: string; _license: string; _notice: string; ayat: Record<string, string>; notes: Record<string, string> };

let fr: Data | null = null;
const load = () => (fr ??= require('../../assets/content/translation-fr.json') as Data);

export type Translation = { lang: 'fr'; label: string; text: string; note: string | null; credit: string };

/** The French translation of one ayah, exactly as published, with its footnotes. */
export function translationOf(surah: number, ayah: number): Translation | null {
  const d = load();
  const key = `${surah}:${ayah}`;
  const text = d.ayat[key];
  if (!text) return null;
  return { lang: 'fr', label: 'Français', text, note: d.notes[key] ?? null, credit: `${d._source} · ${d._license.replace(/-/g, ' ').replace('CC BY ND', 'CC BY-ND')} · كما نُشرت` };
}
