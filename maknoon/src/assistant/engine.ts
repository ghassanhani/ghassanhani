import { gradeLabel, hadithRef, loadPack } from '@/content/hadith';
import { searchTafsirPack } from '@/content/packs';
import { matchCount, searchQuran } from '@/search/engine';
import { fuse, searchByMeaning } from '@/search/semantic';
import { ayatNodes, curatedNodes, type Node } from './corpus';
import { fold, tokens } from './normalize';

const AYAH_BY_KEY = new Map(ayatNodes.map((n) => [`${n.surah}:${n.ayah}`, n]));

/**
 * Retrieval-only assistant (plan §8). No text is generated here: an answer is a
 * list of nodes from the app's own corpus, each rendered verbatim with its
 * source and review status. Personal-ruling questions are never answered.
 */
export type Answer =
  | { kind: 'sources'; query: string; nodes: Node[]; tafsir: Node[] }
  | { kind: 'ruling'; query: string; fiqh: Node[] }
  | { kind: 'scope'; query: string }
  | { kind: 'empty'; query: string };

// "Is it permissible for me…", "must I…", "what should I do…" → personal ruling (fatwa).
const PERSONAL = /(^حكم |^ما حكم|هل يجوز|هل يحل|هل يحرم|هل يجب|هل علي|هل يصح|هل تصح|هل تجوز|ماذا افعل|ما حكم|يجوز لي|علي ان|افتني|فتوي|هل يلزمني|هل اثم)/;
// «does X break the fast / the wudu / the prayer?» asks for a ruling too.
const BREAKS = /^هل .*(يفطر|تفطر|يبطل|تبطل|ينقض|تنقض|يفسد|تفسد)/;
// Out of scope (plan §8.2 rule 6).
const OUT_OF_SCOPE = /(تكفير|كافر|سياس|انتخاب|حزب|انتحار|اقتل|اذي نفسي|طائف)/;


export async function ask(question: string): Promise<Answer> {
  const q = question.trim();
  const nq = fold(q);
  if (OUT_OF_SCOPE.test(nq)) return { kind: 'scope', query: q };

  const toks = tokens(q);
  const need = Math.max(1, Math.ceil(toks.length * 0.6)); // most topic words must appear
  const scored = curatedNodes.map((n) => ({ n, h: matchCount(n.norm, q) })).sort((a, b) => b.h - a.h);
  // Curated hadith, adhkar and modules must match most of the question's topic words.
  // No relaxed fallback here: one shared word made unrelated sources lead the answer.
  const curated = scored.filter((x) => x.h >= need);

  if (PERSONAL.test(nq) || BREAKS.test(nq)) {
    return { kind: 'ruling', query: q, fiqh: curated.filter((x) => x.n.kind === 'fiqh').map((x) => x.n).slice(0, 2) };
  }
  if (!toks.length) return { kind: 'empty', query: q };

  // Ayat: words first (root-aware, same engine as the Search tab). Meaning alone always returns
  // something, related or not, so a meaning-only ayah is kept only where the words or the tafsir agree.
  const [semantic, tafsir] = await Promise.all([searchByMeaning(q, 20).catch(() => []), searchTafsirPack(q, 4).catch(() => [])]);
  // ayat that share only one word of a longer question («رأس» of «حكم مسح الرأس») say nothing about it
  const words = searchQuran(q, 20).filter((h) => !(h.partial && toks.length >= 2));
  const viaTafsir = new Set(tafsir.map((t) => `${t.surah}:${t.ayah}`));
  const agreed = semantic.filter((h) => viaTafsir.has(h.key) || words.some((w) => w.key === h.key));
  let keys = fuse(words, agreed, 5).map((h) => h.key);
  // the question's words are not in the ayat (the Quran says «فاغسلوا» where one asks «الوضوء»): the
  // ayat whose tafsir explains them in those words
  if (!keys.length) keys = [...viaTafsir].slice(0, 3);
  const ayat = keys.map((k) => AYAH_BY_KEY.get(k)).filter((n): n is Node => !!n);

  const hadith = await searchHadith(q).catch(() => []);
  const nodes = [...curated.slice(0, 4).map((x) => x.n), ...ayat, ...hadith];
  if (!nodes.length && !tafsir.length) return { kind: 'empty', query: q };
  return { kind: 'sources', query: q, nodes, tafsir };
}

// Words of a question that say what is asked, not what it is about.
const ASKING = new Set(['كيف', 'كيفيه', 'ما', 'ماذا', 'هل', 'متي', 'اين', 'لماذا', 'عن', 'في', 'من', 'الي', 'علي', 'حكم', 'ما هو', 'هو', 'هي']);
const bare = (w: string) => w.replace(/^(و|ف|ب|ل)?(ال)?/, '');

/**
 * Hadith whose text has every content word of the question (Bulugh al-Maram, then Riyad as-Salihin;
 * Sunnah.com, approved): the text exactly as the source gives it, with its grading and reference.
 */
async function searchHadith(q: string): Promise<Node[]> {
  const want = fold(q).split(/\s+/).filter((w) => w.length >= 3 && !ASKING.has(w)).map(bare).filter((w) => w.length >= 3);
  if (!want.length) return [];
  const out: Node[] = [];
  for (const slug of ['bulugh', 'riyadussalihin']) {
    const pack = await loadPack(slug);
    for (const h of pack.hadith) {
      if (!h.matn) continue;
      const m = fold(h.matn);
      if (!want.every((w) => m.includes(w))) continue;
      out.push({
        id: `hadith:${slug}:${h.id}`,
        kind: 'hadith',
        title: pack.name,
        ref: hadithRef(pack, h),
        route: `/hadith/${slug}:${h.id}`,
        tone: null,
        chip: h.g.length ? gradeLabel(h.g[0]) : slug === 'bulugh' ? 'تخريجه في نصه' : 'لم يذكر المصدر حكمًا',
        text: h.matn,
        norm: '',
      });
      if (out.length >= 3) return out;
    }
  }
  return out;
}
