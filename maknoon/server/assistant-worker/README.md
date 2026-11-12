# Maknoon assistant Worker (optional)

Free AI layer for the in-app assistant, on **Cloudflare Workers AI**: free tier (10,000 neurons a day), and
Cloudflare does not use customer prompts to train models. The app works without it, in sources-only mode.

## What it does

The app sends the question plus the **ids, titles and references** of the sources it already found on the device. The
model (Llama 3.3 70B) returns 1–3 short linking sentences, each citing those ids.

It never receives or writes Quran or hadith text; the app renders that text from its own database. The app then
re-checks every sentence before showing it: citations must be valid, there must be no quotation marks, and no rulings.
See `src/assistant/compose.ts`.

## Deploy (free account)

```bash
cd server/assistant-worker
npx wrangler login
npx wrangler deploy        # prints https://maknoon-assistant.<you>.workers.dev
```

Then set the URL in `app.json` → `expo.extra.assistantUrl` and rebuild the app.

## Privacy

- Request logs and observability are off.
- Questions aren't stored.
- On the free plan, going over the daily limit makes requests fail (the app falls back to sources-only); it never bills.
