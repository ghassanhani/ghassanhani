/**
 * Ratq (رَتْق, ratq.itqan.dev) — Itqan's community catalogue of Quranic resources.
 *
 * Ratq lists each resource with its licence, publisher and a link to the files
 * on Itqan CMS (cms.itqan.dev, may need an Itqan account to download).
 * Maknoon uses it as the rights register: every content source in the app is a
 * Ratq slug, and its attribution line + licence gate come from the catalogue.
 *
 * Offline snapshot: assets/content/ratq-catalog.json (refresh: `npm run sync:ratq`).
 */
import snapshot from '../../assets/content/ratq-catalog.json';

export const RATQ_API = 'https://ratq.itqan.dev/api/resources';

export type RatqResource = {
  slug: string;
  name: string;
  name_ar: string | null;
  type: string; // tafsir | translation | mushaf | font | recitation | dataset | api | …
  license: string; // e.g. CC-BY-ND, CC-BY-NC-ND, MIT, Unspecified
  source_url: string | null; // Itqan CMS asset page
  website_url: string | null;
  github_url: string | null;
  short_description: string | null;
  version: string | null;
  publisher: { name: string; name_ar: string | null } | null;
};

type Snapshot = { source: string; fetchedAt: string; count: number; resources: RatqResource[] };
const catalog = snapshot as Snapshot;
const bySlug = new Map(catalog.resources.map((r) => [r.slug, r]));

export const ratqFetchedAt = catalog.fetchedAt;

export function ratqResource(slug: string): RatqResource {
  const r = bySlug.get(slug);
  if (!r) throw new Error(`Ratq resource "${slug}" is not in the catalogue snapshot`);
  return r;
}

/** "CC-BY-ND" → "CC BY-ND" (as written on the design). */
export const licenseLabel = (license: string) => license.replace(/^CC-/, 'CC ');

/**
 * Maknoon is freemium (plan §12): NonCommercial or unlicensed sources cannot ship.
 * CC BY-ND is allowed but the text must be shown unmodified.
 */
export function licenseGate(license: string): 'ok' | 'no-derivatives' | 'non-commercial' | 'unknown' {
  const l = license.toUpperCase();
  if (l.includes('-NC')) return 'non-commercial';
  if (l === 'UNSPECIFIED' || !l) return 'unknown';
  if (l.includes('-ND')) return 'no-derivatives';
  return 'ok';
}

/** Attribution line used under every linked item: «مركز تفسير عبر رتق · CC BY-ND». */
export function ratqAttribution(slug: string): string {
  const r = ratqResource(slug);
  const who = r.publisher?.name_ar ?? r.publisher?.name ?? r.name_ar ?? r.name;
  return `${who} عبر رتق · ${licenseLabel(r.license)}`;
}

/** Live query against the Ratq API (same params as the Ratq web catalogue). */
export async function searchRatq(params: { type?: string; search?: string; license?: string[]; page?: number; pageSize?: number } = {}) {
  const q = new URLSearchParams();
  if (params.type) q.set('type', params.type);
  if (params.search) q.set('search', params.search);
  params.license?.forEach((l) => q.append('license', l));
  if (params.page) q.set('page', String(params.page));
  q.set('page_size', String(params.pageSize ?? 50));
  const res = await fetch(`${RATQ_API}?${q}`);
  if (!res.ok) throw new Error(`Ratq ${res.status}`);
  return (await res.json()) as { count: number; next: number | null; results: RatqResource[] };
}
