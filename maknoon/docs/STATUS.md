# Maknoon status against the spec

Last updated: 2026-11-12. Run `npm run check` to re-verify everything marked "tested".

## Waiting on the founder

1. **Quran text source.** SPEC §4 clears Tanzil and holds KFGQPC fonts for written permission. The app
   currently shows the KFGQPC text and font (downloaded from the Itqan registry earlier). The Tanzil
   importer is ready but downloading means accepting Tanzil's licence terms, so the founder runs it:
   `npm run fetch:quran`. The app then switches to Tanzil + Amiri Quran by itself. After that, delete
   `assets/fonts/kfgqpc/` and `assets/content/quran-hafs.json`, and rebuild the search text from Tanzil.
2. **Supabase project.** `pipeline/schema.sql` is ready (SPEC §3 plus source/edition/license/reviewer/
   audit_log). No project has been created; say the word and it gets applied.
3. **Scholar test cases** for zakat and inheritance. Both screens show «قيد المراجعة العلمية» until
   `CALCULATORS_REVIEWED` in `src/config.ts` is switched on.
4. **Search test set.** `tests/search-testset.json` is a 30-query starter written by Claude. SPEC §5 says it is
   written with the founder: please review and extend it.
5. **Tafsir footnotes** (SPEC §9.4). Footnotes are currently shown inline in a lighter style. Decide the display.
6. **Design tokens and fonts.** SPEC §7 lists ink/pearl/gold and IBM Plex; the app follows the design canvas
   (teal `#035A5F`, Thmanyah fonts on iOS/Android) as instructed in this project. Confirm the canvas wins.
7. Open questions in SPEC §9 (hadith source, audio source, daily tracker, grader order, «مقترح» tier, name).

## Milestones

| | Milestone | State | Evidence |
|---|---|---|---|
| M0 | Scaffold | Done except simulators | Typecheck, lint and tests run in CI (`.github/workflows/maknoon-ci.yml`). Five tabs, RTL forced. Not run on iOS/Android simulators here (no simulator in this environment); checked in the web build. |
| M1 | Schema and Quran | Partly | 114 surahs / 6,236 ayat loaded, text hash-matches its source (tested). The surah list opens the Mushaf page view at the tapped surah's page (the founder asked to keep that look); an ayah-mode reader exists at `/surah/[id]` but is not linked. Importer re-run changes nothing. **Not done:** Tanzil as the source (item 1), tables live in Postgres (item 2). |
| M2 | Search v1 | Done, with one deviation | Normalizer unit tests for every §5 rule; with/without tashkeel returns the same ayat; test set runs in CI and reports top-5 (73%). **Deviation:** ranking is BM25 over a prebuilt root/stem index instead of SQLite FTS5 — same ranking family, adds roots, and also works in the web build. |
| M3 | Tafsir | Done | Importer verifies every passage has an ayah ID and bodies are byte-identical; prints coverage (5 tafsirs × 6,236 = 100%). Attribution shown on the ayah screen. |
| M4 | Graph and review console | Not started | Schema has `edge`, `audit_log` and an audit trigger. No console yet. `showSuggested` now defaults to off. |
| M5 | Worship tools | Mostly | Prayer times match Adhan's reference tables for 8 methods (tested); 12 methods, 16 manual cities, Asr choice, high-latitude rule; qibla bearing; Hijri date. Computed on device, no location sent. **Not done:** GPS option, compass heading from the sensor, adhkar import (founder's reviewed list), network-traffic inspection on a device. |
| M6 | Hifz program | Logic only | Tracks (sabaq/sabqi/manzil), weak-portion spacing and review lock are pure functions with tests (`src/hifz/tracks.ts`). **Not done:** wiring to the hifz screens, the separate on-device user database. |
| M7 | Link mining | Not started | |
| M8 | Hadith | Blocked | Source not named (SPEC §9.1). Hadith screens show placeholders. |
| M9 | Offline packs | Partly | SQLite packs, manifest with SHA-256, verified download, pack manager in Settings. **Not done:** hosting (`packsBaseUrl` is empty), edge tables in packs, search inside downloaded packs. |
| M10 | Recitation check | Built, not yet run on a phone | Matching logic with 11 tests (`src/recitation/match.ts`). Microphone → on-device Whisper through `whisper.rn` 0.7.4 with audio kept in memory (no filesystem is given to the transcriber, so nothing is written). Optional model pack with SHA-256 check and a row in Settings. Tasmee lives in the Mushaf page, following the founder's design: the microphone button hides the page's words and each appears as it is recited (latest word highlighted green); «؟» reveals the next word and the clear button resets; skipped, changed and hinted words show in gold. The hifz session's «ابدأ» opens the portion's page. The web build plays a scripted preview because it cannot listen. iOS and Android JavaScript bundles build. Model licence: founder confirmed Apache-2.0 on 2026-11-12; credits added. **Not done:** converting and hosting the model (`pipeline/models/convert-tarteel.sh`; needs huggingface.co, which this environment can't reach), a native build and a run on a mid-range Android and an iPhone, the recorded deliberate-mistake set (`pipeline/recitation-eval/`), a network-traffic check, and a word map for the 252 ayat (4%) whose search spelling splits words differently from the displayed text (those show the word's number instead of a highlight). |
| M11 | Module skeletons | Screens only | Hub screens exist from the canvas with sample content. Not loading from fixtures, no coverage meter from real counts. |
| M12 | Semantic search | Done ahead of order | All 6,236 ayat have vectors (BGE-M3, MIT). Top-5 on the test set: words 73% → words + meaning 87% (`npm run search:eval`). Cost: Cloudflare free tier (€0). Only ayat are embedded so far, since other node types don't exist yet. |

## Rule-by-rule (CLAUDE.md)

- **No language-model answers.** The chat route was removed from the Worker and the app. AI output is ranking only.
- **Private by default.** One thing leaves the device: the search phrase, when «البحث بالمعنى» is on
  (Settings → الخصوصية; on by default, as SPEC §5 puts query embedding on a server). No analytics SDK.
- **Text integrity.** Display reads the canonical text; search uses separate normalized data. Imports end
  with verification and write nothing on failure.
- **Rule 7** (no hand-typed scripture). Removed a typed hadith phrase from search keywords and a typed
  basmala from Settings (now read from the source file). Still to clean: the canvas sample content in
  `src/content/*.ts`, which carries design placeholder and sample strings.
- **APP_NAME.** `src/config.ts` reads the one name in `app.json`. Canvas sample strings still spell the name out.
