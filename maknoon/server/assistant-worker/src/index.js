/**
 * Maknoon Worker — Cloudflare Workers AI (free tier; zero-data-retention models; no logging).
 *
 *  POST /             assistant linking sentences  { question, sources:[{id,kind,title,ref,status}] } → { sentences }
 *  POST /embed        meaning vector for one search phrase (≤300 chars)                   { text } → { vector }
 *  POST /embed-batch  build-time only; needs the BUILD_TOKEN secret (absent = disabled)  { texts } → { vectors }
 *
 * The app never sends Quran/hadith text for generation and re-verifies everything it gets back.
 */
const CHAT_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const EMBED_MODEL = '@cf/baai/bge-m3';

const SYSTEM = `أنت مساعد المكنون. لست مفتيًا.
مهمتك: كتابة جملة إلى ثلاث جمل عربية قصيرة تربط بين المصادر المعطاة وسؤال المستخدم.
قواعد صارمة:
- لا تقتبس أي نص من القرآن أو الحديث ولا تكتب علامات الاقتباس « » ﴿ ﴾ ". النصوص تُعرض من قاعدة البيانات.
- لا تُصدر حكمًا شرعيًا ولا تخاطب المستخدم بما يجب عليه أو يجوز له.
- كل جملة يجب أن تستشهد بمعرّف مصدر واحد على الأقل من القائمة المعطاة فقط.
- لا تضف معلومات من خارج المصادر. إن لم تكفِ المصادر فأعد قائمة فارغة.
أعد JSON فقط بالشكل: {"sentences":[{"text":"...","cites":["id"]}]}`;

const cors = (env) => ({
  'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
});
const json = (env, body, status = 200) => Response.json(body, { status, headers: cors(env) });

async function embed(env, texts) {
  const out = await env.AI.run(EMBED_MODEL, { text: texts });
  return out.data;
}

async function compose(env, body) {
  const question = String(body.question ?? '').slice(0, 500);
  const sources = (body.sources ?? []).slice(0, 8).map((s) => ({
    id: String(s.id),
    kind: String(s.kind),
    title: String(s.title).slice(0, 160),
    ref: String(s.ref).slice(0, 120),
    status: String(s.status),
  }));
  if (!question || !sources.length) return { sentences: [] };
  const user = `السؤال: ${question}\nالمصادر:\n${sources.map((s) => `- [${s.id}] (${s.kind}) ${s.title} — ${s.ref} — حالة المراجعة: ${s.status}`).join('\n')}`;
  try {
    const out = await env.AI.run(CHAT_MODEL, {
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: user },
      ],
      max_tokens: 300,
      temperature: 0.2,
    });
    const text = out.response || '';
    const parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
    const ids = new Set(sources.map((s) => s.id));
    return {
      sentences: (parsed.sentences || [])
        .filter((s) => typeof s.text === 'string' && Array.isArray(s.cites))
        .map((s) => ({ text: s.text, cites: s.cites.filter((c) => ids.has(c)) }))
        .filter((s) => s.cites.length)
        .slice(0, 3),
    };
  } catch {
    return { sentences: [] }; // the app stays in sources-only mode
  }
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors(env) });
    if (req.method !== 'POST') return new Response('Maknoon assistant · POST only', { status: 405, headers: cors(env) });
    const path = new URL(req.url).pathname;
    let body;
    try {
      body = await req.json();
    } catch {
      return json(env, { error: 'bad json' }, 400);
    }

    if (path === '/embed') {
      const text = String(body.text ?? '').trim().slice(0, 300);
      if (!text) return json(env, { error: 'empty' }, 400);
      try {
        const [vector] = await embed(env, [text]);
        return json(env, { vector });
      } catch {
        return json(env, { error: 'unavailable' }, 503); // e.g. daily free quota used up → app falls back
      }
    }

    if (path === '/embed-batch') {
      const auth = req.headers.get('Authorization') || '';
      if (!env.BUILD_TOKEN || auth !== `Bearer ${env.BUILD_TOKEN}`) return json(env, { error: 'forbidden' }, 403);
      const texts = (body.texts || []).slice(0, 50).map((t) => String(t).slice(0, 2000));
      return json(env, { vectors: await embed(env, texts) });
    }

    // Questions are never logged (religious belief is special-category data, GDPR art. 9).
    return json(env, await compose(env, body));
  },
};
