/**
 * Rights register: every content source the app shows, keyed to its Ratq entry.
 * Licence and publisher are read from the Ratq catalogue — never hand-typed.
 */
import { usingThmanyah } from '@/theme/fonts';
import { qcf4Available } from './qcf4';
import { quranSource } from './quran';
import { licenseGate, ratqAttribution, ratqResource } from './ratq';

/** «التفاسير الخمسة» — the five Tafsir Center works on Ratq (all CC BY-ND). */
export const TAFSIRS = {
  tabari: 'cms-4',
  ibnKathir: 'cms-5',
  saadi: 'cms-6',
  baghawi: 'cms-7',
  mukhtasar: 'cms-8',
} as const;

export type TafsirKey = keyof typeof TAFSIRS;

export function tafsirSource(key: TafsirKey) {
  const slug = TAFSIRS[key];
  const r = ratqResource(slug);
  return {
    slug,
    title: r.name_ar ?? r.name,
    edition: r.short_description, // e.g. Ibn Kathir: "… published by Dar Ibn al-Jawzi in Saudi Arabia"
    attribution: ratqAttribution(slug),
    gate: licenseGate(r.license),
    filesUrl: r.source_url, // Itqan CMS asset page
  };
}

// Fail loudly in development if a registered source cannot ship under the current distribution.
if (__DEV__) {
  for (const key of Object.keys(TAFSIRS) as TafsirKey[]) {
    const { gate, title } = tafsirSource(key);
    if (gate === 'blocked-non-commercial' || gate === 'unknown') console.warn(`[sources] ${title}: licence "${gate}" — not allowed in Maknoon`);
  }
}

/**
 * Credits shown in Settings › المصادر والتراخيص — built from what the app
 * actually ships (not the design's draft list).
 */

export function credits(): { name: string; terms: string }[] {
  const tafsir = tafsirSource('ibnKathir');
  return [
    { name: quranSource.name === 'Tanzil Uthmani' ? 'نص القرآن · Tanzil' : 'نص القرآن وخطه · مجمع الملك فهد عبر إتقان', terms: quranSource.name === 'Tanzil Uthmani' ? 'CC BY 3.0 · دون تعديل' : 'CC BY-NC-ND · دون تعديل' },
    { name: 'التفاسير الخمسة · مركز تفسير عبر رتق', terms: `${tafsir.attribution.split(' · ').pop()} · كما نُشرت` },
    { name: 'الترجمة الإنجليزية للمعاني · الهلالي وخان (دار الإسلام عبر موسوعة القرآن الكريم) عبر رتق', terms: 'CC BY-ND · كما نُشرت' },
    { name: 'الترجمة الفرنسية للمعاني · رشيد معاش (دار الإسلام عبر موسوعة القرآن الكريم) عبر رتق', terms: 'CC BY-ND · كما نُشرت' },
    { name: 'التلاوات · المركز السعودي للتلاوات القرآنية وجمعية مكنون وغيرهما عبر رتق', terms: 'CC BY-NC-ND · تُشغَّل كما نُشرت' },
    { name: 'مواقيت الصلاة · Adhan', terms: 'MIT' },
    { name: 'بيانات السور · quran-meta', terms: 'MIT' },
    { name: 'الأيقونات · Hugeicons', terms: 'MIT' },
    { name: 'التسميع · whisper.rn · whisper.cpp', terms: 'MIT' },
    { name: 'نموذج التسميع · Tarteel whisper-base-ar-quran', terms: 'Apache-2.0 · محوَّل للهاتف دون إعادة تدريب' },
    { name: 'الخطوط · Amiri · Amiri Quran · IBM Plex Sans Arabic', terms: 'SIL OFL' },
    ...(usingThmanyah ? [{ name: 'خط ثمانية', terms: 'بترخيص ثمانية · مضمّن في التطبيق' }] : []),
    ...(qcf4Available()
      ? [{ name: 'صفحات المصحف · خط مصحف المدينة ١٤٤١ (QCF4) · مجمع الملك فهد، بخط عثمان طه، تجهيز أحمد الغريب', terms: 'دون تعديل · بيانات الصفحات MIT' }]
      : []),
    { name: 'مصادر الحديث والتفسير', terms: '[بحسب الإذن المكتوب]' },
  ];
}
