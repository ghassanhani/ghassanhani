import Constants from 'expo-constants';
import type { Node } from './corpus';

/**
 * Optional AI layer (plan §8.2). When `expo.extra.assistantUrl` points at the
 * Maknoon assistant Worker (server/assistant-worker, Cloudflare Workers AI — free
 * tier, no training on prompts), the model may write 1–3 short linking sentences
 * over the retrieved sources. It never writes Quran/hadith text: the cards below
 * the sentences render the canonical text from the database.
 *
 * Post-generation verifier: a sentence is kept only if
 *  - every citation points at a source that was actually sent,
 *  - it quotes nothing (no «» ﴿﴾ "" — quotes must come from the cards),
 *  - it gives no ruling to the asker (fatwa language).
 * Otherwise the answer silently stays in sources-only mode.
 */
export type Sentence = { text: string; cites: string[] };

const raw = (Constants.expoConfig?.extra as { assistantUrl?: unknown } | undefined)?.assistantUrl;
const url = typeof raw === 'string' && /^https:\/\//.test(raw) ? raw : null;
export const aiEnabled = url !== null;

const QUOTES = /[«»﴿﴾"“”]/;
const RULING = /(يجوز لك|يجب عليك|لا يجوز لك|حرام عليك|عليك ان|افعل|لا تفعل)/;

export async function compose(question: string, sources: Node[]): Promise<Sentence[] | null> {
  if (!url || !sources.length) return null;
  const sent = sources.slice(0, 8).map((s) => ({ id: s.id, kind: s.kind, title: s.title, ref: s.ref, status: s.tone ?? 'none' }));
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, sources: sent }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const data = (await res.json()) as { sentences?: Sentence[] };
    const ids = new Set(sent.map((s) => s.id));
    const ok = (data.sentences ?? [])
      .filter((s) => typeof s?.text === 'string' && Array.isArray(s.cites))
      .map((s) => ({ text: s.text.trim().slice(0, 280), cites: s.cites.filter((c) => ids.has(c)) }))
      .filter((s) => s.text && s.cites.length && !QUOTES.test(s.text) && !RULING.test(s.text))
      .slice(0, 3);
    return ok.length ? ok : null;
  } catch {
    return null;
  }
}
