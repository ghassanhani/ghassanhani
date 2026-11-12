# المكنون · Maknoon (app)

Expo (React Native) + TypeScript app built from the Maknoon design canvas.
Arabic-first and right-to-left, laid out on the 402pt iPhone 17 frame.

## Run

```bash
npm install
npx expo start          # i / a / w for iOS, Android, web
npm run check           # typecheck + lint + tests (also runs in CI)
```

**Read first:** `CLAUDE.md` (the founder's fixed decisions and hard rules), `docs/SPEC.md` (modules, data model,
sources, milestones) and `docs/STATUS.md` (where each milestone stands and what's waiting on the founder).

### Checks

| Command | What it proves |
|---|---|
| `npm test` | Normalizer rules (SPEC §5), tashkeel-invariant search, search test set top-5 rate, prayer times against Adhan's reference tables, bundled text hash-matches its source, hifz tracks, zakat arithmetic |
| `npm run search:eval` | Word search vs word + meaning search on the test set (needs network) |
| `npm run import:ratq` | Rebuilds the tafsir packs and verifies them (ayah IDs, byte-identical bodies, coverage) |
| `npm run fetch:quran` | Downloads the Tanzil text, verifies it (114 surahs, 6,236 ayat, hash) and switches the app to it |

## Screens in this batch

| Route | Screen | Canvas artboard |
|---|---|---|
| `/` (tab) | الرئيسية: next prayer, ayah of the day, wird, adhkar, hifz review, learn, topic | Main |
| `/quran` (tab) | القرآن الكريم: resume, khatma, shortcuts, listen, hifz plan, understand, my Quran | QuranHub / QuranHubFull |
| `/mushaf` | المصحف, tap the page for reading controls (zoom, search) | Mushaf / MushafControls |
| `/ayah/3:3` | آية اليوم with link drawers (التفسير، الأحاديث) | AyahToday |
| `/hadith/bukhari-8` | Hadith: matn, attributed gradings, isnad, shuruh | Hadith |
| `/library` (tab) | المكتبة الإسلامية shelves with coverage meters | Library |
| `/search` (tab) | ابحث: root-aware results + assistant entry | Search |
| `/surahs` | فهرس السور: 114 surahs, 30 juz, my memorisation | SurahIndex |
| `/hifz` | برنامج الحفظ: three tracks, overdue-review lock, mushaf map, pace, spaced review, reminders | Hifz |
| `/hifz/session` | جلسة حفظ: steps, ayah chaining, 20/20 repetition counters, hide-to-recite | HifzSession |
| `/prayer` | مواقيت الصلاة: **live on-device times (Adhan)**, alerts, qibla, Asr rule | Prayer |
| `/adhkar` | الأذكار: five categories, tap counters, source/grading chips | Adhkar |
| `/zakat` | حاسبة الزكاة: nisab by gold or silver, 2.5% | Zakat |
| `/inheritance` | حاسبة المواريث: **worked example only**; engine off until scholar-validated | Inheritance |
| `/fiqh` | مسألة فقهية: four madhhabs (yours first), evidence, cause of disagreement | Fiqh |
| `/usul` | أصل فقهي: definition, applied issues, five major maxims, maqasid | Usul |
| `/narrator` | ترجمة راوٍ: profile, jarh wa ta'dil, teachers and students, narrations | Narrator |
| `/seerah` | السيرة النبوية: filterable timeline with expandable events | Seerah |
| `/topic` | موضوع الصبر: ayat, sunnah, scholars, private reflection | Topic |
| `/grammar` | قاعدة فعل الأمر: two opinions, Quran examples, lexicon, matn | Grammar |
| `/path` | مسار التعلّم: 12 stations, current one expanded with its links | Path |
| `/me` (tab) | أنا: sync status, counts, collections, study, worship tools, Plus, settings | Me |
| `/assistant` | المساعد: sourced answer + personal-ruling refusal (sample; no model connected) | Assistant |
| `/onboarding` | الإعداد الأول: language, madhhab highlight, goals, location mode | Onboarding |
| `/settings` | الإعدادات: reading, prayer, notifications, content, privacy, sources & licences | Settings |
| `/plus` | المكنون بلس: free promise + sadaqah-jariyah pack sponsorship (subscription off in the free app) | Plus |

### Notes on batch 2

- **Prayer times** are computed on the device with [Adhan](https://github.com/batoulapps/adhan-js) (MIT), using Muslim World League
  (Fajr 18°, Isha 17°) for the default city, Barcelona. Home's prayer card uses the same live values. For the design's date
  (10 November) Adhan gives the design's Fajr, sunrise and Dhuhr exactly, and Asr, Maghrib and Isha within 2 minutes. The qibla
  bearing is computed (≈111°; the design's 115° was a sample). The compass doesn't follow device heading yet (needs a sensor).
- **Surah index** names, ayah counts and juz starts come from the KFGQPC data, and Makki/Madani from
  [quran-meta](https://github.com/quran-center/quran-meta) (MIT), generated at build time (`assets/content/quran-index.json`).
  The design's per-surah "reviewed links %" numbers were sample values and are not shown.
- **Adhkar** text, virtues and source chips are the designer's draft, copied verbatim. The canvas says each must be
  reviewed before launch. Items without a source show «المصدر والحكم بانتظار المراجعة».
- **Zakat** only does arithmetic on the one rule the screen states. The default amounts and gram prices are the design's
  examples («الأسعار قيم مثال»).
- **Inheritance** computes only the design's worked example (زوجة + ابن + بنت). Any other combination shows the canvas's
  notice that the full engine is enabled only after scholar-reviewed test cases pass (plan §4.6).

### Notes on batch 3

- Every string in `src/content/modules.ts` is copied verbatim from the canvas, including all `[placeholders]`
  such as `[الجزء/الصفحة]`, `[عدد]` and `[رقم]`. The madhhab positions, references, chips («مُراجَع»/«مقترح»), Seerah link
  counts and path progress are **design samples** and must be replaced by reviewed data. The Quran and hadith snippets
  shown are the design's own strings.
- Modules are reachable from the Library shelves, Home (learn and topic cards), and the Hadith isnad (ابن عمر → narrator).

### Notes on batch 4

- **Plus**: the canvas designs a paid subscription. Because the app is free (`DISTRIBUTION = 'free'`) and some
  sources are NonCommercial, the subscription block (perks, price, «اشترك») is rendered only in a `'commercial'`
  build. The free app shows the always-free line and the pack sponsorship (donations need a registered non-profit).
- **Assistant** (free, plan §8) has two layers:
  1. **Sources-first, on the device, no AI** (`src/assistant/`). It searches all 6,236 ayat (KFGQPC plain-spelling
     index), the hadith, adhkar and modules in the app, and on iOS/Android the bundled al-Mukhtasar tafsir. It answers
     with source cards rendered verbatim, each with its review status. Personal-ruling questions get «هذا سؤال عن حكم
     شخصي» with related fiqh issues and "consult a scholar". Out-of-scope topics are declined. It's free, works offline,
     and nothing leaves the phone.
  2. **No generated text.** The founder's rules (`CLAUDE.md`) say no language-model answers at launch, so the
     linking-sentence experiment was removed from the app and from the Worker. AI only ranks search results.
- **Settings › المصادر والتراخيص** is generated from what the app ships (`credits()` in `src/content/sources.ts`), not
  from the design's draft list.
- **On-device storage** (`src/store/prefs.ts`, AsyncStorage): onboarding (shown on first launch), every Settings
  control, Asr rule, prayer alerts, hifz reminders, pace and overdue-review choice, the Topic reflection, and installed
  packs. Nothing leaves the device. The madhhab chosen in onboarding drives Fiqh's «عرض مذهبي أولًا»,
  Settings › حجم الخط sets the Mushaf size, and «إخفاء التشكيل» applies to hadith and adhkar text only (never Quran or
  ND tafsir).
- Not yet wired: dark theme (the choice is saved, no dark palette yet), real notifications, GPS location.
- The app icon from the canvas is in `assets/brand/app-icon.png` (716 px, corners baked in). The store icon needs a
  1024 px square master from the designer.

### Smart search (on-device, free)

- `src/search/arabic.ts`: normalization (tashkeel, Quranic marks, hamza seats, alef/ya/ta-marbuta), clitic stemming and
  light triliteral root extraction. One-letter prefixes are ambiguous (the ك of كتاب is a root letter, the ب of بدين
  isn't), so each word is indexed under both readings. A few weak-letter roots stay approximate.
- `npm run search:build` builds `assets/content/search-quran.json`: a BM25 index over roots and stems for all 6,236 ayat,
  plus the most frequent word forms per root.
- `src/search/engine.ts` does the ranking.
  - «رحم» or «ر ح م» finds رحمة، الرحيم، يرحم، الرحمن (299 ayat).
  - Exact phrases rank first («إن الله مع الصابرين» → البقرة ١٥٣).
  - Ayat containing most of the query words come first. If none do, it falls back to the rarer, more meaningful word.
  - Queries take a few milliseconds, with no network and no model.
- The **Search tab** is live: root card with derived words (tap to search one), ranked ayat, hadith, adhkar and
  modules, al-Mukhtasar tafsir hits on iOS/Android, and working filters. The **assistant** uses the same engine.
- **Tafsir search** (iOS/Android) uses the same BM25 over a build-time index of the bundled al-Mukhtasar
  (`assets/content/search-mukhtasar.json`). Examples: «الربا» → البقرة ٢٧٥, «بر الوالدين» → مريم ١٤ / الإسراء ٢٥.
- **Long tafsir entries** are paginated, never edited. Ibn Kathir on الفاتحة ١ is about 131k characters; it's revealed in
  growing pages (about 11 taps) and rendered as blocks of at most 3.5k characters.
- Known limits: a root search can't tell meanings apart (رحمة "mercy" vs رَحِم "womb", both ر ح م), and a few
  weak-letter roots are still approximate. Meaning search (below) covers both.

### Meaning search (Cloudflare Workers AI, free tier)

- **What runs where.** Every ayah has a meaning vector (BGE-M3 over the ayah plus its al-Mukhtasar explanation,
  int8, `assets/content/embeddings-ayat.bin`, 6.4 MB). The vectors ship inside the app. Only the search phrase goes to the
  Maknoon Worker, which turns it into a vector. Matching happens on the device.
- **Worker** (`server/assistant-worker`): `POST /embed` (one phrase, ≤300 chars) uses `@cf/baai/bge-m3`. Workers AI
  doesn't keep the inputs, and the Worker has logging and observability off. `POST /embed-batch` is for building only and
  needs a `BUILD_TOKEN` secret; the secret has been deleted, so it's off (403). The URL is `extra.searchWorkerUrl` in
  `app.json`; set it to `null` to turn meaning search off.
- **Hybrid ranking.** Word results (BM25) and meaning results are merged with reciprocal rank fusion (k = 60). Ayat found
  both ways rise to the top. Ayat found only by meaning get a «بالمعنى» chip in the Search tab. Offline, out of free
  quota or after 4 s, the app quietly uses word search alone.
- Examples: «الأمانة في التجارة» → النساء ٢٩ (meaning only), «كيف أتوب من ذنب كبير» → غافر ٣.
- **Rebuild vectors** (only if the Quran text or the bundled tafsir changes): set a temporary `BUILD_TOKEN` secret on the
  Worker, run `MAKNOON_WORKER=https://… MAKNOON_BUILD_TOKEN=… npm run embeddings:build`, then delete the secret.
- **Cost.** About 1,075 neurons per million tokens. A search phrase is a few tokens, so the free daily allowance covers a
  very large number of searches.
- **No AI-written answers.** In testing, a chat model added a fiqh claim that wasn't in its sources, and `CLAUDE.md`
  rules generated religious text out. The Worker's chat route was deleted; only `/embed` remains.
- **Switch.** Settings → الخصوصية → «البحث بالمعنى» turns it off; search then runs entirely on the device.
- **Measured** (`npm run search:eval`, 30-query starter set): words 73% → words + meaning 87% top-5.

## Design system

- `src/theme/tokens.ts` holds the colours, radii and tint blobs read from the canvas (teal `#035A5F` primary).
- `src/components/Squircle.tsx`: every rounded box uses **94% corner smoothing** (via `figma-squircle`), drawn in SVG with
  the glass fill, colour blobs and inner glows. Pills and circles stay fully round.
- `GlassCard` (white 70%, radius 36, inner glow), `HeroCard` (dark tinted), `Chip`
  (`مُراجَع` is a green gradient with the badge icon on the leading/right edge; `مقترح` is a blue gradient), `Cta`, `Segments`.
- `Backdrop` is a fixed tinted gradient behind the scrolling content, with one variant per screen.
- `TabBar` floats over content: blurred white 50% pill, with the active tab as a teal pill plus its label.
- Icons come from Hugeicons (the set the canvas uses).

## Fonts

| Role | Font | In the repo? |
|---|---|---|
| Headings | Thmanyah Serif Display (Black) | No (see licence below) |
| Body | Thmanyah Sans (Regular, Medium, Bold) | No |
| Ayat | KFGQPC Uthmanic Hafs (with KFGQPC text), Amiri Quran (with Tanzil text) | Yes |
| Fallbacks | Amiri, IBM Plex Sans Arabic | Yes (OFL) |

**Thmanyah licence** ([font.thmanyah.com/licenses](https://font.thmanyah.com/licenses)):
- Allowed: commercial use, including bundling the font *inside* a mobile app.
- Not allowed: hosting, sharing or uploading the font files. That includes a git repo.
- Not allowed: making the files extractable by end users, which includes serving them to a browser.
- The files may only be downloaded from font.thmanyah.com.

So:

1. Download Thmanyah Serif Display and Thmanyah Sans from **font.thmanyah.com** and put the `.otf`/`.ttf` files in
   `assets/fonts/thmanyah/` (git-ignored).
2. Run `npm run fonts:link`. This writes `src/theme/thmanyah.local.native.ts`; don't commit it with entries.
3. iOS and Android builds now use Thmanyah. EAS uploads follow `.easignore`, which keeps the local fonts, so cloud builds
   bundle them too. **The web build always uses the fallbacks.**

## Content from Itqan

Content comes from the **Itqan registry** (`api.cms.itqan.dev`; Ratq lists the same catalogue).
`itqan-assets.yaml` is the official manifest:

```bash
npx itqan-cli install     # official CLI, or:
npm run itqan:pull        # same registry API over plain HTTPS → assets/itqan/ (git-ignored)
npm run content:build     # → assets/content/*.json + assets/fonts/kfgqpc/ (committed)
```

| Asset | Used for | Licence |
|---|---|---|
| `unicode-uthmanic-font-hafs-narration` | Full Hafs text with page and juz data, plus the KFGQPC Uthmanic Hafs font | CC BY-NC-ND (KFGQPC) |
| `tafsir-ibn-katheer`, `-altabari`, `-alsaadi`, `-albaghawi`, `-almokhtassar` | التفاسير الخمسة | CC BY-ND (مركز تفسير) |

- **Quran text** is the verbatim KFGQPC Hafs text. Each ayah ends with KFGQPC's ayah-mark glyph, which only the
  KFGQPC font draws, so KFGQPC text is rendered with that font. Amiri Quran is used if you fetch the Tanzil text
  instead (`npm run fetch:quran`, which takes priority when present).
- **Mushaf** page ٥٠ is taken from the KFGQPC page data (آل عمران ١–٩, the same page as the design).
  The registry's `madinah-mushaf-hafs-1441` package holds 604 Adobe Illustrator print files (466 MB), not app data,
  so it isn't used.
- **Tafsir** text is shown exactly as published. Rows marked «قابل للنشر = لا» are skipped. Publisher markup is
  turned into formatting only: `¬…¥` edition notes appear small, and `_…_` gharib words appear in teal.
- **Status chips** on tafsir cards show **the publisher's editorial stage** from the file («مرحلة الاعتماد» → مُراجَع;
  المراجعة or الادخال → مقترح). They are not Maknoon scholar review, which doesn't exist yet. Ibn Kathir v2.1 doesn't state a stage.
- **Tafsir packs** (plan §7.4): `npm run packs:build` turns each tafsir into a SQLite file in `assets/packs/`
  (6,236 ayat each, text byte-for-byte, licence and publisher stored inside) plus `manifest.json` (size, SHA-256).
  - **al-Mukhtasar (3.4 MB) ships inside the app.**
  - al-Sa'di (15.8 MB), Ibn Kathir (34.2 MB), al-Baghawi (24.6 MB) and al-Tabari (51.9 MB) are downloaded from
    **`expo.extra.packsBaseUrl`** in `app.json` and checked against the manifest's SHA-256 before use.
  - Upload those four `.db` files somewhere public (a GitHub Release works; CC BY-ND allows redistribution with
    credit) and set the URL. Until then, Settings shows «التنزيل غير مفعّل بعد».
  - The web build has no SQLite and serves only `tafsir-sample.json`.

## Sources: Ratq (رَتْق)

[Ratq](https://ratq.itqan.dev) is Itqan's catalogue of Quranic resources. It works as the app's **rights register**:

- `assets/content/ratq-catalog.json` is a snapshot of the catalogue (123 resources: name, licence, publisher,
  Itqan CMS link). Refresh it with `npm run sync:ratq`.
- `src/content/ratq.ts` holds the typed client (`GET https://ratq.itqan.dev/api/resources?type=&search=&license=&page=&page_size=`,
  `GET /api/resources/:slug`), the attribution builder (gives «مركز تفسير عبر رتق · CC BY-ND») and the licence gate.
- `src/content/sources.ts` maps each source to its Ratq slug. The five tafsirs (التفاسير الخمسة) are
  الطبري `cms-4`, ابن كثير `cms-5`, السعدي `cms-6`, البغوي `cms-7` and المختصر `cms-8`. All come from مركز تفسير under **CC BY-ND**:
  commercial use is allowed, but the text must be shown unmodified and credited.

Ratq only lists resources. The files are downloaded from **Itqan CMS** (`cms.itqan.dev`, per-asset page in
`source_url`), which may require an Itqan account.

**Maknoon is a free app**: no ads, no subscriptions, no paid features (`DISTRIBUTION = 'free'` in
`src/content/ratq.ts`). That makes Ratq's **CC BY-NC-ND** entries usable as well, with credit and unmodified text:
- KFGQPC mushafs and Uthmanic fonts (Hafs, including the smart-device font)
- التفسير الميسر and غريب القرآن
- المختصر's surah objectives
- the recitations (Saudi Center, Tahbeer, Quran Qiraat, Mknoon)

If a paid tier, ads or sponsored placements are ever added, set `DISTRIBUTION = 'commercial'`. The gate then
flags every NC source, and each must be removed or licensed in writing.

## Content in this batch is design sample

`src/content/design.ts` holds every string, number, grading and reference **copied verbatim from the canvas
layers**, with `[placeholders]` kept exactly as written. None of it is authored by the app. It is not
verified data. Some rows are clearly layout filler (for example, al-Tirmidhi's row reuses
"أخرجه في الصحيح · رقم ١٦", and every library shelf shows the same subtitle). Replace this file with the licensed
content packs and scholar-reviewed links before any release.
