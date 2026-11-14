import { fold } from '../search/arabic.ts';

/**
 * The automatic summary's safety net (founder decision 2026-11-13, assistant level 2). The small
 * on-device model writes a few sentences about the sources it was given; this plain, tested code
 * then keeps only sentences that:
 *   · cite at least one of the given sources by its number ([1] … [n]); other numbers are removed
 *   · quote nothing: no quotation marks or Quran brackets, and no run of 5 words found in any
 *     ayah or in the sources' own texts (sacred text is shown only from the database, below)
 *   · give no ruling or fatwa (permissible / forbidden / obligatory … are left to the sources)
 *   · say something real: at least one content word of the sentence is in the question or in the
 *     source it cites (a template like «the first source mentions this meaning» says nothing)
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

// Words that carry no content of their own (and the words of an answer template).
const EMPTY = new Set(
  'في من الى على عن ان او ما لا لم لن قد كل هذا هذه ذلك تلك الذي التي الذين هو هي هم كان كانت يكون مع بين بعد قبل عند حتى اذا ثم اي غير بها به فيه فيها منه منها له لها لهم عليه عليها كما ايضا مصدر مصادر المصدر المصادر معني المعني جانب جانبا اخر الاول الثاني الثالث الرابع الخامس السادس يذكر تذكر يضيف تضيف يتحدث تتحدث يبين تبين يشير تشير يدل تدل سوال السوال اجابه'.split(' '),
);
/** A rough stem for comparing content words: prefixes and the commonest endings removed. */
const stem = (w: string) => w.replace(/^(و|ف)?(ب|ل|ك)?(ال)?/, '').replace(/(ون|ين|ات|ان|ها|هم|هن|كم|نا|ه|ي)$/, '');
const content = (t: string) => words(t).filter((w) => w.length >= 3 && !EMPTY.has(w) && !EMPTY.has(w.replace(/^(و|ف)?(ال)?/, ''))).map(stem).filter((w) => w.length >= 2);

const toLatin = (s: string) => s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
/** Citation styles small models drift into — (1), [المصدر 1], 【1】, [1، 2] — written as [1] [2]. */
const citations = (s: string) =>
  s
    .replace(/[(（【]\s*(\d{1,2})\s*[)）】]/g, '[$1]')
    .replace(/\[\s*(?:ال)?مصدر\s*(?:رقم\s*)?(\d{1,2})\s*\]/g, '[$1]')
    .replace(/\[(\d{1,2}(?:\s*[،,و]\s*\d{1,2})+)\]/g, (_, list: string) => list.split(/\s*[،,و]\s*/).map((n) => `[${n}]`).join(' '));

/** `ground`: the question and the text of each numbered source; when given, every kept sentence must share a content word with them. */
export function guardSummary(raw: string, sources: number, quoted: (sentence: string) => boolean, max = 3, ground?: { question: string; texts: string[] }): Line[] {
  const asked = ground ? new Set(content(ground.question)) : null;
  const cited = ground ? ground.texts.map((t) => new Set(content(t))) : [];
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
    if (asked && !content(body).some((w) => asked.has(w) || cites.some((c) => cited[c - 1]?.has(w)))) continue;
    out.push({ text: body, cites });
    if (out.length >= max) break;
  }
  return out;
}
