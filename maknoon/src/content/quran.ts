import data from '../../assets/content/quran-uthmani.json';

type QuranFile = { _source: string; _notice: string; ayat: Record<string, string> };
const quran = data as QuranFile;

export const hasQuranText = Object.keys(quran.ayat).length === 6236;
export const quranNotice = quran._notice;

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
export const ar = (n: number | string) => String(n).replace(/[0-9]/g, (d) => AR_DIGITS[+d]);

/**
 * Canonical ayah text from Tanzil (verbatim), or null when the text pack
 * has not been fetched yet. Callers must render a placeholder — never
 * generate or retype Quran text.
 */
export function getAyah(surah: number, ayah: number): string | null {
  return quran.ayat[`${surah}:${ayah}`] ?? null;
}

export const ayahPlaceholder = (surahName: string, ayah: number) => `[نص الآية · ${surahName} ${ar(ayah)}]`;

/** Ayah end marker (U+06DD) followed by Arabic-Indic digits; Amiri Quran draws the medallion. */
export const ayahEnd = (n: number) => `۝${ar(n)}`;
