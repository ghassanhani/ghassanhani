# Maknoon build spec

Reference for building Maknoon. `CLAUDE.md` holds the fixed decisions and hard rules; this file holds the detail. The founder also keeps a longer product document (market, business model, legal, launch); ask for it when a question goes beyond the build.

Contents: 1. Product · 2. Modules · 3. Data model · 4. Content sources · 5. Search · 6. AI · 7. Design · 8. Milestones · 9. Open questions

## 1. Product

**Signature screen:** open an ayah and see, on one calm screen, its text, tafsir, related hadith with gradings, fiqh positions of the four madhhabs with evidence, occasion of revelation, word grammar, and people and events. Each link shows its source and a review badge (مُراجَع / مقترح).

**Navigation (five tabs, RTL):** الرئيسية (today) · القرآن · المكتبة (hadith, fiqh and usul, aqidah, seerah, tazkiyah, Arabic) · ابحث · أنا (notes, hifz, settings).

**Breadth before depth:** every module exists early as a skeleton with honest coverage, and a coverage meter shows how much is reviewed. Depth grows continuously.

## 2. Modules

Version 1 scope is listed per module. Later depth is in the founder's product document.

| # | Module | Version 1 scope |
|---|---|---|
| 2.1 | Quran | Hafs text, ayah mode reader, mushaf mode later, recitation audio when a source is cleared, word root and lemma lookup |
| 2.2 | Tafsir | Five tafsirs from RATQ, each passage keyed to its ayah, shown as published |
| 2.3 | Hadith | Blocked on source (§4). Design: isnad as ordered narrator nodes, gradings as attributed list, parallel-narration clusters |
| 2.4 | Fiqh | Shared chapter tree; per issue, each madhhab's position with evidence links; label "information, not a fatwa". Start with tahara and salah |
| 2.5 | Usul, maxims, maqasid | Primer text (al-Waraqat), the five major maxims, a "why they differ" panel on fiqh issues |
| 2.6 | Aqidah | Core texts with commentary; scope decided by the advisor |
| 2.7 | Seerah and history | Timeline, companion profiles, places; events link to ayat and hadith |
| 2.8 | Tazkiyah and akhlaq | Topic hubs (الإخلاص، الصبر، الشكر، التوبة…) linking ayat, hadith and scholar passages |
| 2.9 | Arabic sciences | Primer (al-Ajurrumiyya); tap a Quran word → grammatical role → rule → other ayat showing it |
| 2.10 | Worship tools | Prayer times and qibla on-device, adhkar with counters, Hijri calendar, zakat and inheritance calculators |
| 2.11 | Hifz program | Three daily tracks (new, recent review, long-term review), review lock, guided memorization steps, mutashabihat notebook |
| 2.12 | Recitation check (تسميع) | Experimental, on-device; flags skipped or changed words after each ayah |
| 2.13 | Search | One search across all modules (§5) |
| 2.14 | Daily tracker | **Proposed, not confirmed (§9).** Prayers, Quran wird, adhkar, fasting, evening self-review; on-device only |

### 2.10 Worship tools: details

- **Prayer times:** `adhan-js`, computed on-device. User picks the calculation method and madhhab for Asr. Default to a manually chosen city; GPS is optional and coordinates stay on the device.
- **Adhkar:** five groups (any time, morning and evening, after prayer, sleep and waking, daily occasions). The founder has the seed list. Each dhikr is a node linked to its hadith. Counters for repeated ones (3, 33, 34, 100). Several seed items still lack a source or full text; import only items the founder marks as reviewed.
- **Inheritance and zakat:** pure functions with a test suite of cases validated by the scholar. Ship only after those tests pass.

### 2.11 Hifz program: details

- **Tracks:** Sabaq (new portion, size set by user), Sabqi (last 7–20 days), Manzil (rotating block of everything memorized, computed by the app).
- **Review lock:** when review falls behind, suggest pausing new material; the user can override.
- **Guided steps for a new portion:** read its short tafsir → listen with ayah repeat → chain ayat (1, 2, 1+2, 3…) → repetition counter (default 20 read + 20 recited, adjustable) → self-test with ayat hidden.
- **Spaced review** for portions marked weak: 1 day, 3 days, 1 week, 2 weeks, 1 month.
- **Teacher log:** record sessions with a teacher and their corrections. The app presents itself as a helper to the teacher.

### 2.12 Recitation check: details

- **Model:** `tarteel-ai/whisper-base-ar-quran` (listed as Apache 2.0; confirm on the model card). Convert for a mobile Whisper runtime (whisper.cpp through a React Native binding such as `whisper.rn`; check its current state first).
- **Delivery:** optional download pack, roughly 75–150 MB.
- **Matching:** expected ayah is known. Normalize both sides with the search normalizer (§5), align tolerantly, flag only clear differences (missing word, substituted word, jumped ayah).
- **Wording:** "تأكد من هذه الكلمة" style prompts. Label the feature "تجريبي".
- **Test before release:** a set of recordings with deliberate mistakes, because the model may output the correct ayah even when the reciter erred. Record the catch rate and false-alarm rate.
- **Audio:** processed on-device and discarded. Tajweed judgement is out of scope.

## 3. Data model

Postgres is the source of truth. Device packs are SQLite exports of the same tables.

```sql
create table node (
  id text primary key,              -- 'ayah:2:255', 'hadith:bukhari:1', 'tafsir:ibn-kathir:2:255'
  type text not null,
  title_ar text, title_en text,
  body_ar text,                     -- canonical, exactly as imported
  body_ar_norm text,                -- normalized, search only
  meta jsonb not null default '{}',
  source_id text not null, edition_id text, license_id text not null,
  embedding vector(1024)            -- filled in the semantic-search milestone
);

create table edge (
  id bigserial primary key,
  src text not null references node(id),
  dst text not null references node(id),
  rel text not null,
  qualifier jsonb not null default '{}',   -- madhhab, order, disputed
  provenance text not null,                -- 'imported:<source>', 'citation_mined', 'scholar'
  confidence real,
  status text not null default 'suggested', -- suggested | reviewed | rejected
  reviewed_by text, reviewed_at timestamptz,
  evidence_ref text                        -- where the link is stated (book, volume, page)
);

create table grading (
  hadith_id text not null references node(id),
  grader_id text not null,
  verdict text not null,
  source_ref text not null,
  primary key (hadith_id, grader_id, source_ref)
);
```

Also: `source`, `edition`, `license` (with the attribution string to display), `reviewer`, `audit_log`.

**Node types:** `ayah`, `surah`, `word`, `root`, `lemma`, `tafsir_passage`, `hadith`, `hadith_variant_cluster`, `isnad`, `narrator`, `person`, `sharh_passage`, `fiqh_issue`, `fiqh_position`, `usul_principle`, `legal_maxim`, `maqsad`, `aqidah_topic`, `akhlaq_topic`, `grammar_rule`, `lexicon_entry`, `event`, `place`, `book`, `topic`, `dhikr`, `learning_path`.

**Edge types:** `explains`, `cites`, `evidence_for`, `occasion_of`, `abrogates` (with a disputed flag), `parallel_of`, `narrated_by` (ordered), `teacher_of`, `participant_in`, `located_at`, `about_topic`, `same_root`, `part_of`, `derived_by`, `applies_to`, `cause_of_disagreement`, `exemplified_by`, `defines`.

**User data** (notes, hifz state, tracker, counters) lives in a separate on-device SQLite database, never mixed with content tables. Sync is opt-in and comes later.

## 4. Content sources

Status **cleared** means ingest freely. Anything else: ask the founder first.

| Content | Source | Status | Notes |
|---|---|---|---|
| Quran text (Hafs) | Tanzil, Uthmani text | cleared | Keep verbatim; show the Tanzil credit and link |
| Tafsir: الطبري، السعدي، ابن كثير، البغوي، المختصر | RATQ (ratq.itqan.dev), from مركز تفسير | cleared (founder works with the RATQ team) | Labelled CC-BY-ND: show as published with attribution; already split by ayah with coded footnotes. Ask the founder how footnotes should be displayed |
| French translation of meanings | RATQ (Rachid Maach) | cleared | Verbatim with attribution |
| Prayer times | `adhan-js` | cleared | MIT |
| Recitation-check model | `tarteel-ai/whisper-base-ar-quran` | confirm licence on model card | |
| Hadith text and gradings | undecided | **blocked** | Candidates: future RATQ resources, a permission from Sunnah.com or Dorar, or the public-domain `fawazahmed0/hadith-api` (provenance questions). Build the schema and importer interface now; ingest when the founder names the source |
| Other translations | QuranEnc | ask | Conditions apply |
| Recitation audio | undecided | **blocked** | |
| Quran display font | Amiri Quran (OFL) | cleared as default | KFGQPC fonts wait for written permission |
| Word morphology | Quranic Arabic Corpus | ask | Licence is GPL with conditions |
| Fiqh, usul, aqidah, seerah, tazkiyah, grammar texts | undecided | ask | Check RATQ first for each |

Each importer lives in `pipeline/importers/<source>/` and is deterministic and re-runnable: raw → cleaned → canonical IDs → verification → load.

**Verification examples:** Quran import must yield 114 surahs and 6,236 ayat, and the stored text must hash-match the source file. A tafsir import must map every passage to an existing ayah ID and keep the body byte-identical to the source.

## 5. Search

Version 1 is lexical and runs offline at no cost. The semantic layer comes after.

**Normalizer** (one shared function, used for indexing, queries and recitation matching):

- Strip tashkeel, tatweel and Quranic annotation marks.
- أ إ آ ٱ → ا · ى → ي · ة → ه · ؤ → و · ئ → ي.
- Collapse whitespace; strip punctuation.
- Applied to `body_ar_norm` only. `body_ar` stays untouched.

**Lexical layer:** SQLite FTS5 on device, Postgres full-text plus trigram on the server. A root index so a query for a root finds all its forms (ر ح م → رحمة، الرحيم، يرحم). Filters: type, book, grade, madhhab.

**Semantic layer (later milestone):** embed all nodes once, locally, with an open multilingual model that is strong in Arabic (benchmark BGE-M3 and multilingual-E5 on an Arabic test set; confirm the licence of the one chosen). Embed queries on a small CPU server. Rank by fusing lexical and semantic results. Budget ceiling: about €10 a month.

**Results layout ("assistant" without a language model):** group results as آيات · أحاديث · تفسير · أحكام · موضوعات, each item opening its node with its links. When nothing clear is found, say so and show the nearest results.

**Quality bar:** a search test set written with the founder (queries with expected nodes). Track how often the expected node is in the top 5.

## 6. AI

| Use | Where it runs | Cost | Output goes to |
|---|---|---|---|
| Recitation check | User's device | Free | User, labelled experimental |
| Semantic search | Local GPU once + small CPU server | About €5–10 a month | Ranking only; shows real sources |
| Link mining (e.g. hadith cited inside Ibn Kathir → canonical hadith IDs) | Founder's machine (RTX 5070 Ti) or the founder's Claude plan | Free | `edge` rows with `status = 'suggested'`, then human review |
| Entity extraction, parallel-narration clustering, topic tagging | Same | Free | Suggested rows, then human review |

AI output reaches users only as ranking or as links a human has reviewed. If a generated-answer assistant is added later, it returns node IDs that the app renders from the database, and a code check drops any reference that does not resolve.

## 7. Design

**Tokens:** ink `#2B4282` · deep ink `#1C2C5A` · pearl `#F7F4EE` · cream `#EFE6D2` · gold `#B8975A` (sparingly). Grading states are distinguishable without relying on red versus green.

**Type:** Quran in Amiri Quran. Classical body text in Amiri or Noto Naskh Arabic. UI in IBM Plex Sans Arabic. Arabic line-height 1.8–2.2 to leave room for tashkeel. User-adjustable text size.

**Motifs:** oval and pearl containers, subtle paper texture in reading mode. The founder supplies the logo, icon and screen designs; build from his Figma when it exists and ask when it does not.

**Also:** full dark mode, dynamic type, VoiceOver and TalkBack labels in Arabic, a visible trail back through graph jumps.

## 8. Milestones

Do them in order. Each is done when all its criteria pass.

**M0. Scaffold.** Expo app, TypeScript strict, five tabs, tokens and fonts, RTL forced, lint and tests wired.
Done when: the app runs on iOS and Android simulators; all five tabs render correctly in RTL; typecheck, lint and tests pass in CI.

**M1. Schema and Quran.** Tables from §3, Tanzil importer, ayah-mode reader.
Done when: 114 surahs and 6,236 ayat are loaded; stored text hash-matches the source; the reader shows any surah with the Tanzil credit; re-running the importer changes nothing.

**M2. Search v1.** Normalizer, FTS5, root index, results layout.
Done when: the normalizer has unit tests for every rule in §5; searching with and without tashkeel returns the same ayat; the search test set runs in CI and reports top-5 hit rate.

**M3. Tafsir.** RATQ importer for the five tafsirs; tafsir drawer on the ayah screen.
Done when: every passage maps to an existing ayah ID; bodies are byte-identical to the source; each tafsir's attribution appears on screen; per-tafsir ayah coverage is printed by the importer.

**M4. Graph and review console.** Edge tables, link drawers on the ayah screen, an internal web console to move links from suggested to reviewed.
Done when: a reviewer can approve or reject a link and the change is in `audit_log`; the app shows only reviewed links by default; the coverage meter reads from real counts.

**M5. Worship tools.** Prayer times, qibla, Hijri date, adhkar with counters.
Done when: prayer times match the `adhan-js` reference test data for the supported methods; everything works in airplane mode; no location leaves the device (verified by inspecting network traffic).

**M6. Hifz program.** §2.11.
Done when: the three tracks are computed from a user's memorized set in unit tests; the review lock triggers and can be overridden; all hifz data is in the on-device user database.

**M7. Link mining.** Pipeline that proposes links; first target is hadith citations inside Ibn Kathir (needs M8's hadith IDs to resolve fully, so start with ayah-to-ayah references and asbab al-nuzul).
Done when: the pipeline writes only `suggested` edges with provenance and confidence; a sample of 100 is exported for the founder and scholar to score.

**M8. Hadith.** Starts when the founder names the source (§4).
Done when: counts per book match the source; every hadith shows its attributed gradings; isnad narrators resolve to narrator nodes or are listed as unresolved.

**M9. Offline packs.** SQLite packs per module with edge tables and a licence manifest; download manager.
Done when: a fresh install can download a pack, go offline and use search and links; pack hash is verified on download.

**M10. Recitation check.** §2.12.
Done when: it runs on a mid-range Android phone and an iPhone; the deliberate-mistake test set has recorded catch and false-alarm rates; no audio is written to disk or sent over the network.

**M11. Remaining module skeletons.** Fiqh, usul, aqidah, seerah, tazkiyah, Arabic: screens and importer interfaces, content as sources are cleared.
Done when: each module has a hub screen, its node types load from fixtures made by script from real sources, and its coverage shows honestly (including zero).

**M12. Semantic search.** §5.
Done when: all nodes have embeddings; top-5 hit rate on the test set is higher than M2's; monthly server cost is within the ceiling.

## 9. Open questions (founder decides)

1. Hadith source (blocks M8).
2. Recitation audio source.
3. Daily tracker module (§2.14): build it or not.
4. How to display the coded tafsir footnotes from RATQ.
5. Doctrinal scope and aqidah framing (with the advisor).
6. Default order of hadith graders, and whether weak hadith show by default.
7. Whether unreviewed links ever show, in a labelled "مقترح" tier.
8. Final app name and descriptor (trademark check open).
9. Which reviewed adhkar items to import first.
