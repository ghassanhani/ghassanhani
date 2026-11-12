# المكنون · Maknoon (app)

Expo (React Native) + TypeScript app built from the Maknoon design canvas.
Arabic-first and right-to-left, laid out on the 402pt iPhone 17 frame.

## Run

```bash
npm install
npx expo start          # i / a / w for iOS, Android, web
npm run typecheck
```

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
| `/me` (tab) | Placeholder; Me/Settings/Plus come in the next batch | (none yet) |

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

| Role | Font | Status |
|---|---|---|
| Headings | Thmanyah Serif Display (Black) | **Not bundled.** Its licence is personal use only and forbids redistribution |
| Body | Thmanyah Sans | **Not bundled** (same licence) |
| Ayat | Amiri Quran | Bundled (OFL) |

Download Thmanyah from font.thmanyah.com, put the `.otf`/`.ttf` files in `assets/fonts/thmanyah/`
(git-ignored), then run `npm run fonts:link`. Until you do, the app falls back to Amiri (headings) and
IBM Plex Sans Arabic (body). Shipping the app with Thmanyah needs a commercial licence from Thmanyah.

## Quran text

The app never types or generates Quran text. It reads the verbatim **Tanzil Uthmani** text
(CC BY 3.0, no changes allowed) from `assets/content/quran-uthmani.json`, which is committed empty.

```bash
npm run fetch:quran   # running it means you accept https://tanzil.net/docs/text_license
```

Until you fetch it, ayat render as placeholders such as `[نص الآية · آل عمران ٣]`. The Mushaf screen reflows the
text with Amiri Quran. A page-faithful Madani layout needs the QCF V2 glyph fonts and their licence (plan §4.1, §5).

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

Licence gate for a freemium app: these Ratq entries are **CC BY-NC-ND, so non-commercial only**, and must not
ship without separate written permission:
- KFGQPC mushafs and Uthmanic fonts
- التفسير الميسر and غريب القرآن
- المختصر's surah objectives, Dar Alnafais word meanings and miqra's الجامع الوجيز
- every recitation listed, including the "Mknoon" ones

## Content in this batch is design sample

`src/content/design.ts` holds every string, number, grading and reference **copied verbatim from the canvas
layers**, with `[placeholders]` kept exactly as written. None of it is authored by the app. It is not
verified data. Some rows are clearly layout filler (for example, al-Tirmidhi's row reuses
"أخرجه في الصحيح · رقم ١٦", and every library shelf shows the same subtitle). Replace this file with the licensed
content packs and scholar-reviewed links before any release.
