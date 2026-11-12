import tanzil from '../../assets/content/quran-uthmani.json';
import hafs from '../../assets/content/quran-hafs.json';
import { F } from '@/theme/fonts';

/**
 * Quran text — never typed or generated, only read from a licensed file:
 *
 *  1. KFGQPC Uthmanic Hafs v2.0 (via Itqan, CC BY-NC-ND; bundled). Each ayah ends with
 *     the KFGQPC ayah-mark glyph, so it MUST be drawn with the KFGQPC Uthmanic Hafs font.
 *  2. Tanzil Uthmani (CC BY 3.0) if `npm run fetch:quran` was run — drawn with Amiri Quran,
 *     the font Tanzil's text is designed for. Ayah marks are added by the app.
 */
type TanzilFile = { _notice: string; ayat: Record<string, string> };
type HafsFile = { _source: string; _license: string; surahs: Record<string, string>; ayat: Record<string, string>; pos: Record<string, [number, number]> };

const tz = tanzil as TanzilFile;
const kf = hafs as unknown as HafsFile;
const useTanzil = Object.keys(tz.ayat).length === 6236;

export const quranSource = useTanzil
  ? { name: 'Tanzil Uthmani', credit: 'نص المصحف: مشروع تنزيل (tanzil.net) · CC BY 3.0', notice: tz._notice }
  : { name: 'KFGQPC Hafs', credit: 'نص المصحف: مجمع الملك فهد لطباعة المصحف الشريف عبر إتقان · CC BY-NC-ND', notice: kf._license };

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
export const ar = (n: number | string) => String(n).replace(/[0-9]/g, (d) => AR_DIGITS[+d]);

/** Ayah end marker for Tanzil text (U+06DD + Arabic-Indic digits; Amiri Quran draws the medallion). */
export const ayahEnd = (n: number) => `۝${ar(n)}`;

export type Ayah = { text: string; fontFamily: string };

/** Canonical ayah, ready to render (text already carries its end mark). */
export function getAyah(surah: number, ayah: number): Ayah | null {
  const k = `${surah}:${ayah}`;
  if (useTanzil) {
    const t = tz.ayat[k];
    return t ? { text: `${t} ${ayahEnd(ayah)}`, fontFamily: F.quran } : null;
  }
  const t = kf.ayat[k];
  return t ? { text: t, fontFamily: F.quranHafs } : null;
}

/** Ayat on a Madinah mushaf page (KFGQPC page numbers), in order. */
export function ayatOnPage(page: number): { surah: number; ayah: number }[] {
  return Object.entries(kf.pos)
    .filter(([, p]) => p[0] === page)
    .map(([k]) => {
      const [surah, ayah] = k.split(':').map(Number);
      return { surah, ayah };
    });
}

export const ayahPlaceholder = (surahName: string, ayah: number) => `[نص الآية · ${surahName} ${ar(ayah)}]`;
