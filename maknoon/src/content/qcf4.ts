/**
 * The Madinah Mushaf (1441, QCF4) page layout: 604 pages of 15 lines, each line the exact
 * glyphs of the printed page. Built and verified by pipeline/importers/qcf4 (every glyph tied
 * to the KFGQPC Hafs text); see that file for the checks.
 *
 * The font files are bundled on iOS/Android only (src/theme/qcf4.local.native.ts). Without them
 * (web, or a clone that has not run the import) `qcf4Available` is false and the Mushaf keeps
 * the Unicode text.
 */
import * as Font from 'expo-font';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { qcf4Fonts } from '@/theme/qcf4.local';
import { quranIndex } from './worship';

type Line =
  /** surah header */
  | { h: number }
  /** basmala: one glyph in font `f` */
  | { b: string; f: string }
  /** words: one glyph per word or mark; `a` ayah number (1–6236, 0 none), `i` Hafs word index (-1 ayah end, -2 other mark) */
  | { g: string; a: number[]; i: number[] };

type Data = { em: { line: number; ascent: number; descent: number }; pages: { f: string; l: Line[] }[] };

// The page data ships with every build (glyph codes and ayah numbers only, no text).
const data = require('../../assets/content/qcf4-pages.json') as Data;

/** Preview builds can set this flag after loading the fonts themselves (never in the app). */
const preview = () => Platform.OS === 'web' && !!(globalThis as { __QCF4_PREVIEW__?: boolean }).__QCF4_PREVIEW__;

export const qcf4Available = () => Object.keys(qcf4Fonts).length > 0 || preview();

export const qcf4Em = data.em;
export const qcf4Page = (page: number) => data.pages[page - 1];
export type Qcf4Line = Line;

// Ayah number (1–6236) → "surah:ayah"
const KEYS: string[] = [];
for (const s of quranIndex.surahs) for (let a = 1; a <= s.ayat; a++) KEYS.push(`${s.n}:${a}`);
export const ayahKey = (n: number) => KEYS[n - 1];

// "s:a" → the Madinah page where that ayah begins
let PAGE_OF: Map<string, number> | null = null;
export function pageOfAyah(key: string) {
  if (!PAGE_OF) {
    PAGE_OF = new Map();
    data.pages.forEach((pg, i) => {
      for (const l of pg.l) if ('a' in l) for (const n of l.a) if (n && !PAGE_OF!.has(KEYS[n - 1])) PAGE_OF!.set(KEYS[n - 1], i + 1);
    });
  }
  return PAGE_OF.get(key) ?? null;
}

/** Loads the fonts a page needs (its page font, plus the basmala font when it has one). */
export function useQcf4Fonts(page: number) {
  const pg = qcf4Page(page);
  const names = [pg.f, ...pg.l.flatMap((l) => ('b' in l ? [l.f] : []))];
  const need = [...new Set(names)];
  const id = need.join(',');
  const [done, setDone] = useState('');
  const loaded = qcf4Available() && (preview() || done === id || need.every((n) => Font.isLoaded(n)));
  useEffect(() => {
    if (loaded || !qcf4Available()) return;
    let live = true;
    const map: Record<string, number> = {};
    for (const n of id.split(',')) if (qcf4Fonts[n]) map[n] = qcf4Fonts[n];
    Font.loadAsync(map)
      .then(() => live && setDone(id))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [id, loaded]);
  return loaded;
}
