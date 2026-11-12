# Maknoon search Worker

Cloudflare Worker for **meaning search** only (SPEC §5 semantic layer). No text is generated.

- `POST /embed` `{ text }` → `{ vector, model }`: turns one search phrase (≤300 chars) into a BGE-M3 vector.
  The app matches it on the device against the ayah vectors it ships with.
- `POST /embed-batch`: build-time only. Needs a `BUILD_TOKEN` secret; without it the route answers 403.

Workers AI doesn't retain inputs, and logging/observability is off (`wrangler.toml`).

## Deploy

```bash
npx wrangler deploy
```

Set the URL in `app.json` → `expo.extra.searchWorkerUrl` (`null` turns meaning search off).

## Rebuild the ayah vectors

Only when the Quran text or the bundled tafsir changes:

```bash
npx wrangler secret put BUILD_TOKEN          # temporary
MAKNOON_WORKER=https://… MAKNOON_BUILD_TOKEN=… npm run embeddings:build
npx wrangler secret delete BUILD_TOKEN
```
