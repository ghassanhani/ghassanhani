/**
 * Rights register: every content source the app shows, keyed to its Ratq entry.
 * Licence and publisher are read from the Ratq catalogue — never hand-typed.
 */
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

// Fail loudly in development if a registered source cannot ship in a paid app.
if (__DEV__) {
  for (const key of Object.keys(TAFSIRS) as TafsirKey[]) {
    const { gate, title } = tafsirSource(key);
    if (gate === 'non-commercial' || gate === 'unknown') console.warn(`[sources] ${title}: licence "${gate}" — not allowed in Maknoon`);
  }
}
