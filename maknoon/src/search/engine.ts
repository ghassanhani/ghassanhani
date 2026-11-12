import index from '../../assets/content/search-quran.json';
import plain from '../../assets/content/quran-search.json';
import { fold } from './arabic';
import { type Hit, type Index, rootInfoIn, searchIndex } from './core';

/**
 * Smart search, fully on-device (SPEC §5): the pure core (core.ts) bound to the
 * app's Quran index. «رحم» finds رحمة · الرحيم · يرحم · الرحمن; tashkeel and hamza
 * forms are ignored; an exact phrase match ranks first. No network, no model.
 */
export { fuse, matchCount, searchIndex, terms } from './core';
export type { Hit, Index } from './core';

const IDX = index as unknown as Index;
const PLAIN = plain as Record<string, string>;
const normPlain: string[] = IDX.keys.map((k) => fold(PLAIN[k]));

export type AyahHit = Hit;
export function searchQuran(query: string, limit = 20): AyahHit[] {
  return searchIndex(IDX, query, limit, normPlain);
}

/** Root card for a one-word (or spaced «ر ح م») query: the root, how many ayat, and its derived words. */
export const rootInfo = (query: string) => rootInfoIn(IDX, query);
