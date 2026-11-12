/**
 * Maknoon assistant Worker — Cloudflare Workers AI (free tier: 10,000 neurons/day;
 * Cloudflare does not train on customer prompts). Keeps the AI binding server-side.
 *
 * Contract: POST { question, sources: [{ id, kind, title, ref, status }] }
 *        →  { sentences: [{ text, cites: [id] }] }
 * The model sees only source ids/titles/refs and may write 1–3 short Arabic linking
 * sentences. It must not quote, must not rule, and must cite only the given ids.
 * The app verifies all of this again (src/assistant/compose.ts) before showing anything.
 */
export interface Env {
  AI: { run: (model: string, input: unknown) => Promise<{ response?: string } | unknown> };
  ALLOWED_ORIGIN?: string;
}

const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

const SYSTEM = `أنت مساعد المكنون. لست مفتيًا.
مهمتك: كتابة جملة إلى ثلاث جمل عربية قصيرة تربط بين المصادر المعطاة وسؤال المستخدم.
قواعد صارمة:
- لا تقتبس أي نص من القرآن أو الحديث ولا تكتب علامات الاقتباس « » ﴿ ﴾ ". النصوص تُعرض من قاعدة البيانات.
- لا تُصدر حكمًا شرعيًا ولا تخاطب المستخدم بما يجب عليه أو يجوز له.
- كل جملة يجب أن تستشهد بمعرّف مصدر واحد على الأقل من القائمة المعطاة فقط.
- لا تضف معلومات من خارج المصادر. إن لم تكفِ المصادر فأعد قائمة فارغة.
أعد JSON فقط بالشكل: {"sentences":[{"text":"...","cites":["id"]}]}`;

type Source = { id: string; kind: string; title: string; ref: string; status: string };

function cors(env: Env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN ?? '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors(env) });
    if (req.method !== 'POST') return new Response('POST only', { status: 405, headers: cors(env) });

    let body: { question?: string; sources?: Source[] };
    try {
      body = await req.json();
    } catch {
      return Response.json({ sentences: [] }, { status: 400, headers: cors(env) });
    }
    const question = String(body.question ?? '').slice(0, 500);
    const sources = (body.sources ?? []).slice(0, 8).map((s) => ({ id: String(s.id), kind: String(s.kind), title: String(s.title).slice(0, 160), ref: String(s.ref).slice(0, 120), status: String(s.status) }));
    if (!question || !sources.length) return Response.json({ sentences: [] }, { headers: cors(env) });

    const user = `السؤال: ${question}\nالمصادر:\n${sources.map((s) => `- [${s.id}] (${s.kind}) ${s.title} — ${s.ref} — حالة المراجعة: ${s.status}`).join('\n')}`;
    let sentences: { text: string; cites: string[] }[] = [];
    try {
      const out = (await env.AI.run(MODEL, {
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: user },
        ],
        max_tokens: 300,
        temperature: 0.2,
      })) as { response?: string };
      const text = out.response ?? '';
      const json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
      const ids = new Set(sources.map((s) => s.id));
      sentences = (json.sentences ?? [])
        .filter((s: { text?: unknown; cites?: unknown }) => typeof s.text === 'string' && Array.isArray(s.cites))
        .map((s: { text: string; cites: string[] }) => ({ text: s.text, cites: s.cites.filter((c) => ids.has(c)) }))
        .filter((s: { cites: string[] }) => s.cites.length)
        .slice(0, 3);
    } catch {
      sentences = []; // any failure → the app stays in sources-only mode
    }
    // No logging of questions (religious belief is special-category data, GDPR art. 9).
    return Response.json({ sentences }, { headers: cors(env) });
  },
};
