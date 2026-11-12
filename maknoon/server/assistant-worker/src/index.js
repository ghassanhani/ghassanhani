/**
 * Maknoon Worker — meaning search only (SPEC §5 semantic layer, §6 AI).
 * Cloudflare Workers AI free tier; inputs are not retained; no logging.
 *
 *  POST /embed        meaning vector for one search phrase (≤300 chars)                  { text } → { vector, model }
 *  POST /embed-batch  build-time only; needs the BUILD_TOKEN secret (absent = disabled)  { texts } → { vectors }
 *
 * No text is generated anywhere: AI output reaches users only as ranking (CLAUDE.md).
 */
const EMBED_MODEL = '@cf/baai/bge-m3';

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

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors(env) });
    if (req.method !== 'POST') return new Response('Maknoon search · POST only', { status: 405, headers: cors(env) });
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
        return json(env, { vector, model: EMBED_MODEL });
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

    return json(env, { error: 'not found' }, 404);
  },
};
