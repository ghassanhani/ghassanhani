/**
 * Translations of the meanings, verbatim from RATQ (built by pipeline/importers/ratq/translation.mjs), CC BY-ND:
 *   English — Hilali & Khan (IslamHouse, via QuranEnc), RATQ cms-9 (founder decision 2026-11-13)
 *   French — Rachid Maach (IslamHouse, via QuranEnc), RATQ cms-10 (SPEC §4 cleared)
 */
type Data = { _source: string; _license: string; _notice: string; ayat: Record<string, string>; notes: Record<string, string> };

export type Lang = 'en' | 'fr';
export const LANGS: { key: Lang; label: string }[] = [
  { key: 'en', label: 'English' },
  { key: 'fr', label: 'Français' },
];

const cache: Partial<Record<Lang, Data>> = {};
const load = (lang: Lang) =>
  (cache[lang] ??= (lang === 'en' ? require('../../assets/content/translation-en.json') : require('../../assets/content/translation-fr.json')) as Data);

export type Translation = { lang: Lang; label: string; text: string; note: string | null; credit: string };

/** One ayah in the chosen translation, exactly as published, with its footnotes. */
export function translationOf(surah: number, ayah: number, lang: Lang = 'en'): Translation | null {
  const d = load(lang);
  const key = `${surah}:${ayah}`;
  const text = d.ayat[key];
  if (!text) return null;
  return {
    lang,
    label: LANGS.find((l) => l.key === lang)!.label,
    text,
    note: d.notes[key] ?? null,
    credit: `${d._source} · CC BY-ND · كما نُشرت`,
  };
}
