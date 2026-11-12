# Maknoon (المكنون)

A linked Islamic knowledge base for mobile, Arabic-first. Every ayah, hadith, tafsir passage and ruling is a node; every relationship is a typed, sourced, reviewed link. Built by a solo founder (a product designer) with Claude Code.

Read `docs/SPEC.md` before starting any milestone, changing the data model, or ingesting content. It holds the modules, schema, sources, search spec and the milestone list with completion criteria.

## Fixed decisions

- **Stack:** Expo (React Native) + TypeScript. Supabase Postgres for the content graph. SQLite (FTS5) on device for offline packs.
- **RTL first.** Arabic is the default locale; every screen is built and checked in RTL before LTR.
- **Free to run.** Every feature must cost close to zero per user. Work runs on the device or is precomputed once; a per-request paid API needs the founder's approval first.
- **No language model answers at launch.** "Assistant" means smart search that returns real sources in an organized layout. Generated text about religion is out of scope until the founder says otherwise.
- **Private by default.** No account required. Worship logs, hifz progress and audio stay on the device. Location is used on-device for prayer times. Ship with zero third-party tracking or ad SDKs.
- **Calm, respectful UX.** Progress is shown plainly; reminders are set by the user. Points, streak pressure and reward counters stay out.

## Sacred text integrity (hard rules)

1. Quran, hadith and tafsir text is **stored and displayed exactly as imported**. Display code reads the canonical column; search uses a separate normalized column.
2. Every import ends with a **verification step** (counts and hashes against the source file). An import that fails verification is rolled back.
3. Every node carries `source_id`, `edition_id` and `license_id`. Every screen that shows content shows its attribution.
4. Links enter the database as `suggested`. Only a human reviewer moves a link to `reviewed`. The app shows `reviewed` links by default.
5. Hadith are always shown with their gradings, each attributed to its grader.
6. Deterministic calculations (prayer times, qibla, zakat, inheritance) are plain tested code.
7. Seed text for tests comes from the real source files, copied by script. Leave religious text out of hand-written fixtures and code comments.

## Ask the founder before

- Ingesting any source not marked **cleared** in `docs/SPEC.md` §4.
- Adding a dependency that sends data off the device, or any paid service.
- Changing node or edge types, or anything in the rules above.
- Deciding anything listed under "Open questions" in `docs/SPEC.md` §9.

## Working agreement

- Work one milestone at a time, in the order in `docs/SPEC.md` §8. A milestone is done only when every completion criterion listed for it passes.
- The founder is a designer: explain trade-offs in plain language, and show screens early.
- The app name and descriptor live in one config constant (`APP_NAME`), because the trademark check is still open.
