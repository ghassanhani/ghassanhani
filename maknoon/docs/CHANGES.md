# Maknoon: what was built, and what changed after CLAUDE.md and SPEC.md

Written 2026-11-12. Part 1 is the work done before you gave me `CLAUDE.md` and `docs/SPEC.md`.
Part 2 is what changed because of those two files. Part 3 is what is still open.

---

## Part 1 · Before the two files

### The app from your design canvas

- Expo (React Native) + TypeScript app, Arabic-first and right-to-left, on the 402pt iPhone 17 frame.
- Visual language from the canvas: 70% white glass cards with radius 36 and inner glows, a fixed tinted
  gradient backdrop, teal `#035A5F`, a floating blurred tab bar, and 94% corner smoothing (squircles) on
  every rounded box. Pills and circles stay fully round.
- Chips: «مُراجَع» green gradient with the badge icon, «مقترح» blue gradient.
- Five tabs: الرئيسية · القرآن · المكتبة · ابحث · أنا.
- Screens built from the canvas rows: Home, Quran hub, Mushaf, Ayah of the day, Hadith, Library, Search,
  surah list, hifz (overview and session), prayer times, adhkar, zakat, inheritance, fiqh, usul, narrator,
  seerah, topic, grammar, learning path, assistant, onboarding, settings.
- All `[placeholders]` from the canvas kept exactly as written. No Quran or hadith text was invented.

### Fonts

- Thmanyah Serif Display and Thmanyah Sans from the zip you uploaded, on iOS and Android only. The font
  licence forbids web serving and sharing, so the font files are never committed and the web build falls
  back to other fonts.

### Content

- Quran text: KFGQPC Uthmanic Hafs v2.0 with its matching font, from the Itqan registry (RATQ).
- Five tafsirs from مركز تفسير through RATQ: الطبري، ابن كثير، البغوي، السعدي، المختصر. Shown as published.
- The RATQ catalogue is used as the rights register. The app is free, so non-commercial licences are allowed
  and the subscription screen is hidden.
- Settings › المصادر والتراخيص is generated from what the app really ships.

### Storage and offline

- Preferences and progress saved on the device. Onboarding shows on first launch.
- Tafsir packs as SQLite files with a manifest and SHA-256 check. Al-Mukhtasar ships inside the app; the
  other four are downloadable packs (hosting not set up yet). A pack manager sits in Settings.
- Long tafsir entries (Ibn Kathir on الفاتحة ١ is about 131,000 characters) are shown page by page, never edited.

### Prayer times

- Computed on the device with the Adhan library. One city (Barcelona) and one method (Muslim World League),
  with the Asr choice.

### Search and assistant

- Root-aware word search over all 6,236 ayat, built into the app: «رحم» finds رحمة، الرحيم، يرحم.
- Tafsir search in al-Mukhtasar on iOS and Android.
- The "assistant" answers with source cards only, and refuses personal-ruling questions.
- Meaning search through Cloudflare (free tier): a Worker turns the search phrase into a vector, and the
  app matches it on the device against vectors for every ayah. Results from word search and meaning search
  are merged.
- An experiment with AI-written linking sentences was built but kept switched off, because in testing the
  model added a fiqh claim that wasn't in its sources.

---

## Part 2 · What changed after CLAUDE.md and SPEC.md

### Removed, because the rules forbid it

| Rule | Change |
|---|---|
| No language-model answers | The AI-sentence code was deleted from the app. The chat route was deleted from the live Worker; it now only embeds search phrases. |
| No hand-typed scripture | A typed hadith phrase was removed from search keywords. The typed basmala in Settings is now read from the Quran source file. |
| Reviewed links only by default | «اعرض المقترح» is now off by default. |

### Changed to match the spec

| Area | Before | After |
|---|---|---|
| Normalizer | My own rules (every hamza became alef) | Exactly SPEC §5, with a test for each rule. Hamza folding is kept as a separate step for search keys only. |
| Importers | Loose scripts in `scripts/` | Under `pipeline/importers/`, each ending in a verification step that writes nothing on failure |
| Tafsir import | No checks | Verifies every passage maps to an ayah, text is byte-identical to the source, prints coverage (5 × 6,236 = 100%) |
| Quran import | Count check only | 114 surahs, 6,236 ayat and a hash match against the source |
| Prayer times | 1 city, 1 method | 16 cities, 12 methods, Asr choice, high-latitude rule. Tested against Adhan's reference tables. |
| Zakat and inheritance | Shown as working calculators | «قيد المراجعة العلمية» notice until a scholar approves the test cases |
| Meaning search | Always on | A switch in Settings › الخصوصية. The app also checks the Worker uses the same model as the bundled vectors. |
| App name | Typed in several screens | One constant, `APP_NAME` |
| Worker | Open chat route + embed route | Embed route only |

### Added

- **Ayah-mode reader for any surah** (`/surah/[id]`), with the source credit. Before, every surah in the
  list opened the same Mushaf page.
- **Tests: 46**, run with `npm test`. They cover the normalizer rules, search with and without tashkeel,
  the search test set, prayer times, bundled text hashes, hifz logic and zakat arithmetic.
- **Lint and CI.** A GitHub Actions workflow runs typecheck, lint and tests on every push. The first run passed.
- **Search test set**: 30 queries with expected ayat (a starter I wrote; you review it).
- **Database schema** for Supabase (`pipeline/schema.sql`): the tables from SPEC §3 plus source, edition,
  licence, reviewer and audit log. Not applied to any project yet.
- **Hifz logic** as tested code: the three daily tracks, weak-portion spacing (1, 3, 7, 14, 30 days) and the
  review lock. Not connected to the hifz screens yet.
- **Tanzil importer**, ready to run (see Part 3).
- `CLAUDE.md`, `docs/SPEC.md` and `docs/STATUS.md` in the repository.

### Search got better along the way

Share of test queries with the right ayah in the top 5:

| | Before | After |
|---|---|---|
| Word search alone | 63% | 73% |
| Word + meaning search | not measured | 87% |

The gain in word search came from fixing how one-letter prefixes are read (the ك of كتاب is part of the
word; the ب of بدين is not). Each word is now indexed both ways.

### Kept on purpose, although the spec says otherwise

| Spec says | App does | Why |
|---|---|---|
| SQLite FTS5 for word search | A prebuilt root and stem index with the same ranking family | Adds root matching and also works in the web build |
| Semantic search is the last milestone (M12) | Already built | You asked for it; it lifts the hit rate from 73% to 87% |
| Blue, pearl and gold colours; IBM Plex for UI | Teal and Thmanyah from your canvas | You told me to build from the canvas |

---

## Part 3 · Still open

### Needs you

1. **Quran text source.** The spec clears Tanzil with Amiri Quran and holds KFGQPC fonts for written
   permission. The app still shows the KFGQPC text and font. Run `npm run fetch:quran` in the `maknoon`
   folder; it downloads and verifies the Tanzil text and the app switches by itself.
2. **Supabase project.** Say if I should create one and apply the schema.
3. **Scholar test cases** for zakat and inheritance.
4. **Review the search test set** (`tests/search-testset.json`).
5. **Meaning search default.** It is on by default and sends the search phrase to your Worker.
6. **Tafsir footnote display**, and the other open questions in SPEC §9.

### Not built yet

- Review console for links (M4).
- Link mining (M7).
- Hadith (M8): blocked until you name a source.
- Hosting for the downloadable tafsir packs (M9).
- Recitation check (M10).
- Loading the other modules from real sources (M11).
- GPS option and live compass for prayer and qibla.
- Hifz logic wired to the screens.
- Testing on iOS and Android simulators. Only the web build has been checked.

`docs/STATUS.md` has the milestone-by-milestone table.
