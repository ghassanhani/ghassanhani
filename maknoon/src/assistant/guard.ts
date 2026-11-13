import { fold } from '../search/arabic.ts';

/**
 * The automatic summary's safety net (founder decision 2026-11-13, assistant level 2). The small
 * on-device model writes a few sentences about the sources it was given; this plain, tested code
 * then keeps only sentences that:
 *   · cite at least one of the given sources by its number ([1] … [n]); other numbers are removed
 *   · quote nothing: no quotation marks or Quran brackets, and no run of 5 words found in any
 *     ayah or in the sources' own texts (sacred text is shown only from the database, below)
 *   · give no ruling or fatwa (permissible / forbidden / obligatory … are left to the sources)
 * At most 3 sentences are kept. Anything that fails is dropped, never repaired.
 */
export type Line = { text: string; cites: number[] };

const QUOTES = /[«»﴿﴾"“”„]/;
// Ruling vocabulary (folded spelling): such statements are left to the fiqh sources and scholars.
// Whole words only (after و/ف/ب/ل/ال), so «حكمة» (wisdom) or «فرضية» are not caught.
const RULING = new Set(['يجوز', 'تجوز', 'جايز', 'يحرم', 'تحرم', 'حرام', 'محرم', 'محرمه', 'حلال', 'واجب', 'واجبه', 'يجب', 'تجب', 'فرض', 'فريضه', 'مكروه', 'مستحب', 'مستحبه', 'مباح', 'فتوي', 'افتي', 'بدعه', 'حكم', 'حكمها']);
const isRuling = (t: string) => words(t).some((w) => RULING.has(w) || RULING.has(w.replace(/^(و|ف)?(ب|ل)?(ال)?/, '')));
const GRAM = 5;

const words = (t: string) => fold(t).split(/\s+/).filter(Boolean);
const grams = (w: string[]) => {
  const out: string[] = [];
  for (let i = 0; i + GRAM <= w.length; i++) out.push(w.slice(i, i + GRAM).join(' '));
  return out;
};

/** A quote detector over texts that must never be retyped by the model. */
export function quoteCheck(texts: Iterable<string>) {
  const set = new Set<string>();
  for (const t of texts) for (const g of grams(words(t))) set.add(g);
  return (sentence: string) => grams(words(sentence)).some((g) => set.has(g));
}

const toLatin = (s: string) => s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
/** Citation styles small models drift into — (1), [المصدر 1], 【1】, [1، 2] — written as [1] [2]. */
const citations = (s: string) =>
  s
    .replace(/[(（【]\s*(\d{1,2})\s*[)）】]/g, '[$1]')
    .replace(/\[\s*(?:ال)?مصدر\s*(?:رقم\s*)?(\d{1,2})\s*\]/g, '[$1]')
    .replace(/\[(\d{1,2}(?:\s*[،,و]\s*\d{1,2})+)\]/g, (_, list: string) => list.split(/\s*[،,و]\s*/).map((n) => `[${n}]`).join(' '));

export function guardSummary(raw: string, sources: number, quoted: (sentence: string) => boolean, max = 3): Line[] {
  const text = raw.replace(/<think>[\s\S]*?(<\/think>|$)/g, '').trim();
  const out: Line[] = [];
  for (const piece of text.split(/(?<=[.!؟?])\s+|\n+/)) {
    const s = citations(toLatin(piece.trim()));
    if (!s) continue;
    const cites = [...new Set([...s.matchAll(/\[(\d{1,2})\]/g)].map((m) => Number(m[1])))].filter((n) => n >= 1 && n <= sources);
    if (!cites.length) continue;
    const body = s.replace(/\s*\[\d{1,2}\]/g, '').replace(/\s+([.،؛!؟])/g, '$1').trim();
    if (body.length < 8) continue;
    if (QUOTES.test(body) || isRuling(body) || quoted(body)) continue;
    out.push({ text: body, cites });
    if (out.length >= max) break;
  }
  return out;
}
