import { searchTafsirPack } from '@/content/packs';
import { ayatNodes, curatedNodes, type Node } from './corpus';
import { normalize, tokens } from './normalize';

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
// Out of scope (plan §8.2 rule 6).
const OUT_OF_SCOPE = /(تكفير|كافر|سياس|انتخاب|حزب|انتحار|اقتل|اذي نفسي|طائف)/;

function score(n: Node, toks: string[]) {
  let s = 0;
  for (const t of toks) if (n.norm.includes(t)) s += t.length >= 4 ? 2 : 1;
  return s;
}

export async function ask(question: string): Promise<Answer> {
  const q = question.trim();
  const nq = normalize(q);
  if (OUT_OF_SCOPE.test(nq)) return { kind: 'scope', query: q };

  const toks = tokens(q);
  const need = Math.max(1, Math.ceil(toks.length * 0.6)); // most topic words must appear
  const hits = (n: Node) => toks.filter((t) => n.norm.includes(t)).length;
  const curated = curatedNodes
    .map((n) => ({ n, s: score(n, toks), h: hits(n) }))
    .filter((x) => x.h >= need)
    .sort((a, b) => b.s - a.s);

  if (PERSONAL.test(nq)) {
    return { kind: 'ruling', query: q, fiqh: curated.filter((x) => x.n.kind === 'fiqh').map((x) => x.n).slice(0, 2) };
  }
  if (!toks.length) return { kind: 'empty', query: q };

  const ayat = ayatNodes
    .map((n) => ({ n, s: score(n, toks), hits: toks.filter((t) => n.norm.includes(t)).length }))
    .filter((x) => x.hits >= need)
    .sort((a, b) => b.s - a.s || (a.n.surah! - b.n.surah! || a.n.ayah! - b.n.ayah!))
    .slice(0, 5)
    .map((x) => x.n);

  const nodes = [...curated.slice(0, 4).map((x) => x.n), ...ayat];
  const tafsir = await searchTafsirPack(toks, need, 3).catch(() => []);
  if (!nodes.length && !tafsir.length) return { kind: 'empty', query: q };
  return { kind: 'sources', query: q, nodes, tafsir };
}
