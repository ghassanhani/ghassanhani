import { Amiri_400Regular, Amiri_700Bold } from '@expo-google-fonts/amiri';
import { AmiriQuran_400Regular } from '@expo-google-fonts/amiri-quran';
import {
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_500Medium,
  IBMPlexSansArabic_700Bold,
} from '@expo-google-fonts/ibm-plex-sans-arabic';
import { thmanyahFonts } from './thmanyah.local';

/**
 * Typography roles from the canvas:
 *  - display: Thmanyah Serif Display (black) — headings
 *  - sans:    Thmanyah Sans — body / UI
 *  - quran:   Amiri Quran — ayat (Tanzil text); KFGQPC Uthmanic Hafs for the KFGQPC text
 *
 * Thmanyah licence (font.thmanyah.com/licenses): commercial use in apps is allowed when
 * the font is bundled inside the app; hosting/sharing the files or making them
 * extractable (e.g. served to a browser) is not. So: native builds only, files never
 * committed. Download from font.thmanyah.com into assets/fonts/thmanyah and run
 * `npm run fonts:link`. Until then — and always on web — Amiri (display) and
 * IBM Plex Sans Arabic (sans) are used.
 */
export const fontAssets = {
  Amiri_400Regular,
  Amiri_700Bold,
  AmiriQuran_400Regular,
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_500Medium,
  IBMPlexSansArabic_700Bold,
  // KFGQPC Uthmanic Hafs v2.0 (via Itqan, CC BY-NC-ND) — pairs with the KFGQPC Hafs text
  UthmanicHafs: require('../../assets/fonts/kfgqpc/UthmanicHafs.ttf') as number,
  ...thmanyahFonts,
};

const has = (name: string) => name in thmanyahFonts;

export const F = {
  display: has('ThmanyahSerifDisplay-Black') ? 'ThmanyahSerifDisplay-Black' : 'Amiri_700Bold',
  displayBold: has('ThmanyahSerifDisplay-Bold') ? 'ThmanyahSerifDisplay-Bold' : 'Amiri_700Bold',
  /** CTA labels — the canvas sets buttons in Thmanyah Serif Text, black */
  cta: has('ThmanyahSerifText-Black') ? 'ThmanyahSerifText-Black' : 'Amiri_700Bold',
  sans: has('ThmanyahSans-Regular') ? 'ThmanyahSans-Regular' : 'IBMPlexSansArabic_400Regular',
  sansMedium: has('ThmanyahSans-Medium') ? 'ThmanyahSans-Medium' : 'IBMPlexSansArabic_500Medium',
  sansBold: has('ThmanyahSans-Bold') ? 'ThmanyahSans-Bold' : 'IBMPlexSansArabic_700Bold',
  quran: 'AmiriQuran_400Regular', // Tanzil text
  quranHafs: 'UthmanicHafs', // KFGQPC text
} as const;

export const usingThmanyah = has('ThmanyahSerifDisplay-Black') && has('ThmanyahSans-Regular');
