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
const PERSONAL = /(هل يجوز|هل يحل|هل يحرم|هل يجب|هل علي|هل يصح|هل تصح|هل تجوز|ماذا افعل|ما حكم|يجوز لي|علي ان|افتني|فتوي|هل يلزمني|هل اثم)/;
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

  // Root-aware BM25 over all ayat (same engine as the Search tab).
  // Hybrid: root-aware BM25 fused with meaning-based ranking (when the Worker is reachable).
  const semantic = await searchByMeaning(q, 20).catch(() => []);
  const ayat = fuse(searchQuran(q, 20), semantic, 5)
    .map((h) => AYAH_BY_KEY.get(h.key))
    .filter((n): n is Node => !!n);

  const nodes = [...curated.slice(0, 4).map((x) => x.n), ...ayat];
  const tafsir = await searchTafsirPack(q, 3).catch(() => []);
  if (!nodes.length && !tafsir.length) return { kind: 'empty', query: q };
  return { kind: 'sources', query: q, nodes, tafsir };
}
