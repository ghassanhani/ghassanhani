import { Directory, File, Paths } from 'expo-file-system';
import { initLlama, type LlamaContext } from 'llama.rn';
import manifest from '../../assets/models/manifest.json';
import { download } from '@/store/downloads';
import { getPrefs, setPrefs } from '@/store/prefs';
import { allAyahPlain, ayahPlain, type Node } from './corpus';
import { guardSummary, quoteCheck } from './guard';
import type { Summary, SummaryInfo, SummaryStatus } from './summary';

/**
 * Assistant level 2 (founder decision 2026-11-13): a short automatic summary above the sources.
 * A small open model (Qwen3-4B, Apache-2.0) runs on the phone; the question and the
 * sources never leave it. It is given only the numbered sources the search found, asked to say in
 * 2–3 sentences how they answer the question, citing each by its number, and its output then passes
 * guard.ts (no quoting, no rulings, every sentence cited). The sources themselves are always shown
 * below, from the database, exactly as before.
 *
 * The model is an optional download (about 2.5 GB, official file from Hugging Face pinned to one
 * revision, checked against its SHA-256 before use).
 */
export type { Line } from './guard';
export type { Summary, SummaryInfo, SummaryStatus } from './summary';
export const summaryModel = (manifest as unknown as { summary: SummaryInfo }).summary;

const dir = () => new Directory(Paths.document, 'models');
const file = () => new File(dir(), `${summaryModel.id}.v${summaryModel.version}.gguf`);

export function summaryStatus(): SummaryStatus {
  return getPrefs().summaryModel && file().exists ? 'ready' : 'missing';
}

let ctx: Promise<LlamaContext> | null = null;
async function release() {
  const c = ctx;
  ctx = null;
  if (c) await (await c).release().catch(() => undefined);
}

/** Download and verify the model (in the background; progress via useDownload('summary')). Throws on network or checksum errors (nothing is kept). */
export async function downloadSummaryModel(): Promise<void> {
  if (!dir().exists) dir().create({ intermediates: true });
  await download('summary', summaryModel.url, file(), summaryModel.sha256, summaryModel.title, summaryModel.bytes);
  setPrefs({ summaryModel: true });
}

export async function removeSummaryModel(): Promise<void> {
  await release();
  const f = file();
  if (f.exists) f.delete();
  setPrefs({ summaryModel: false });
}

const load = () =>
  (ctx ??= initLlama({ model: file().uri, n_ctx: 2048, n_gpu_layers: 99, use_mlock: false }).catch((e) => {
    ctx = null;
    throw e;
  }));

const SYSTEM = [
  'أنت مساعد يلخّص مصادر إسلامية مرقّمة تُعطى لك، ولا تعرف شيئًا غيرها.',
  'اكتب بالعربية الفصحى البسيطة جملتين أو ثلاثًا تبيّن كيف تتصل هذه المصادر بسؤال المستخدم.',
  'اختم كل جملة برقم المصدر الذي تعتمد عليه بين قوسين مربعين، مثل [1].',
  'لا تقتبس نص أي آية أو حديث أو ذكر، ولا تضع علامات تنصيص؛ صِف المعنى بكلماتك.',
  'لا تذكر أي معلومة ليست في المصادر، ولا تُصدر حكمًا فقهيًا ولا فتوى، ولا تقل حلال أو حرام أو واجب.',
  'ابدأ مباشرة بالجواب عن السؤال بمعاني المصادر نفسها، ولا تكتب جملًا عامة عن المصادر لا تقول شيئًا.',
  'إن لم تُجب المصادر عن السؤال فقل ذلك في جملة واحدة مع رقم أقرب مصدر.',
].join('\n');

let quotes: ((s: string) => boolean) | null = null;
const sourceText = (n: Node) => (n.kind === 'ayah' && n.surah ? ayahPlain(`${n.surah}:${n.ayah}`) : (n.text ?? '')).replace(/\s+/g, ' ').slice(0, 600);

/**
 * The summary for one answer: guarded lines, each with the numbers of the sources it rests on
 * (the same numbers the source cards show), and, when there are none, why: the model could not
 * run, or the guard dropped every sentence. The sources are shown either way.
 */
export async function summarize(question: string, sources: Node[]): Promise<Summary> {
  if (summaryStatus() !== 'ready' || !getPrefs().aiSummary || !sources.length) return { lines: [] };
  const list = sources.slice(0, 6);
  const numbered = list.map((n, i) => `[${i + 1}] ${n.title} · ${n.ref}\n${sourceText(n)}`).join('\n\n');
  let text: string;
  try {
    const c = await load();
    const res = await c.completion({
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `السؤال: ${question}\n\nالمصادر:\n${numbered}\n\nأجب عن السؤال من هذه المصادر في جملتين أو ثلاث، كل جملة برقم مصدرها. /no_think` },
      ],
      jinja: true,
      enable_thinking: false, // Qwen3: answer straight away, no reasoning block
      n_predict: 260,
      temperature: 0.2,
      top_p: 0.9,
      stop: ['<|im_end|>', '<|endoftext|>'],
    });
    text = res.text ?? '';
  } catch (e) {
    return { lines: [], why: 'failed', error: String((e as Error)?.message ?? e).slice(0, 120) };
  }
  quotes ??= quoteCheck(allAyahPlain());
  const own = quoteCheck(list.map(sourceText));
  // grounded in the sources' own words only — not their labels («آية · المائدة ٦» says nothing)
  const lines = guardSummary(text, list.length, (s) => quotes!(s) || own(s), 3, { question, texts: list.map((n) => sourceText(n)) });
  return lines.length ? { lines } : { lines: [], why: text.trim() ? 'filtered' : 'empty' };
}
