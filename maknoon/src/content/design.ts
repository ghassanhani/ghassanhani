/**
 * Sample content copied verbatim from the Maknoon design canvas.
 *
 * Nothing here is authored by the app: every string, number, grading and
 * reference comes from the Figma layers. Values in [brackets] are the
 * designer's placeholders and must stay exactly as written.
 *
 * ⚠️ DESIGN SAMPLE — before release, replace with data from the licensed
 * content packs and scholar-reviewed links (see the product plan §5–§9).
 * Some references below are clearly layout filler (e.g. the al-Tirmidhi
 * row reuses "أخرجه في الصحيح · رقم ١٦"); do not ship them as facts.
 */
import type { TintName } from '@/theme/tokens';
import { tafsirSource } from './sources';

export const home = {
  greeting: 'السلام عليكم',
  name: 'غسان',
  avatarLetter: 'غ',
  prayer: {
    label: 'الصلاة القادمة · برشلونة',
    next: 'العصر',
    time: '١٥:٣٥',
    countdown: 'بعد ساعة و ١٢ دقيقة',
    times: [
      { name: 'الفجر', time: '٦:٢١' },
      { name: 'الظهر', time: '١٣:٣٦' },
      { name: 'العصر', time: '١٥:٣٤', active: true },
      { name: 'المغرب', time: '١٧:٤٦' },
      { name: 'العشاء', time: '١٩:١٢' },
    ],
  },
  ayahOfDay: { title: 'آية اليوم', surah: 3, ayah: 3, surahName: 'آل عمران', ref: 'آل عمران : ٣' },
  wird: { label: 'وِردي اليوم', title: 'سورة الكهف', meta: 'الآية ٥ من ٧', progress: 91.563 / 139 },
  adhkarCard: { label: 'الأذكار', title: 'أذكار المساء', meta: 'كل ذِكر مع مصدره ودرجته', cta: 'ابدأ الآن' },
  hifzReview: { label: 'مراجعة الحفظ', title: '٣ مقاطع اليوم', surahs: ['الملك', 'القلم', 'الحاقة'] },
  adhkarRail: [
    { title: 'أذكار الصباح والمساء', icon: 'ramadhan1' },
    { title: 'الذكر المطلق', icon: 'quran3' },
    { title: 'أذكار بعد الصلاة', icon: 'ramadhan2' },
    { title: 'أذكار بعد الصلاة', icon: 'quran2' },
  ] as const,
  learn: {
    label: 'مسار التعليم',
    title: 'أركان الإسلام من مصادرها',
    next: 'التالي: الزكاة · آياتها وأحاديثها وأحكام المذاهب',
    // 6 segments: 3 done, 1 in progress (gold), 2 to go — as drawn
    segments: ['on', 'on', 'on', 'part', 'off', 'off'] as const,
  },
  topic: {
    label: 'موضوع الأسبوع · التزكية',
    title: 'الصبر',
    meta: 'آيات · أحاديث مخرّجة · من مدارج السالكين',
  },
};

export const quranHub = {
  title: 'القرآن الكريم',
  resume: { label: 'تابع من حيث توقفت', surah: 'سورة الكهف', meta: 'الآية ٧٧ من ١١٠ · الجزء ١٦', progress: 0.67 },
  khatma: { title: 'ختمتي', plan: 'خطة ٣٠ يومًا · جزء كل يوم', done: '٢', unit: 'جزء', doneFraction: 2 / 30, wirdLabel: 'ورد اليوم', wird: 'الجزء ١٦ · نحو ٢٠ صفحة', cta: 'اقرأ الان' },
  shortcuts: [
    { title: 'المصحف الشريف', icon: 'quran2', route: '/mushaf' },
    { title: 'آيات للدراسة', icon: 'sparkle', route: null },
    { title: 'فهرس سور القران', icon: 'list', route: null },
    { title: 'أذكار بعد الصلاة', icon: 'quran2', route: null },
  ] as const,
  listen: { title: 'استمع', surah: 'سورة الكهف', meta: '[القارئ المرخّص] · من الآية ٧٧' },
  hifz: {
    title: 'احفظ',
    plan: 'خطة اليوم',
    count: '٠ من ٣',
    items: [
      { title: 'الحفظ الجديد', meta: 'الملك ١–٥', state: 'on' },
      { title: 'المراجعة القريبة', meta: 'القلم · الحاقة · المعارج', state: 'on' },
      { title: 'المراجعة البعيدة', meta: 'الجزء ٣٠ · النصف الأول', state: 'warn' },
    ] as const,
    cta: 'ابدأ جلسة اليوم',
    tools: [
      { title: 'التسميع', meta: 'تجريبي', icon: 'mic' },
      { title: 'المتشابهات', meta: 'دفترك', icon: 'books' },
    ] as const,
  },
  understand: {
    title: 'افهم',
    items: [
      { title: 'التفاسير الخمسة', meta: 'الطبري · ابن كثير · البغوي · السعدي · المختصر' },
      { title: 'كلمة بكلمة', meta: 'الإعراب والقاعدة والمعنى' },
      { title: 'مستكشف الجذور', meta: 'كل مواضع الجذر في القرآن' },
      { title: 'موضوعات القرآن', meta: 'الفهرس الموضوعي للآيات' },
    ],
    cta: 'ابدأ جلسة اليوم',
  },
  mine: {
    title: 'قرآني',
    items: [
      { title: 'العلامات', count: '٢٣', icon: 'bookmark' },
      { title: 'التظليلات', count: '٣', icon: 'brush' },
      { title: 'الملاحظات', count: '٥', icon: 'note' },
    ] as const,
  },
};

export const mushaf = {
  surahTitle: 'سورة آل عمران',
  surah: 3,
  surahName: 'آل عمران',
  basmala: '﷽', // ﷽ as in the design layer
  page: '٥٠',
  ayat: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  marker: 'ربع حزب',
  zoom: '١٠٠',
  searchPlaceholder: 'ابحث عن اية أو سورة',
};

export type LinkItem = {
  source: string;
  status: 'reviewed' | 'suggested';
  body: string;
  meta: string;
};

// Source title + «مركز تفسير عبر رتق · CC BY-ND» come from the Ratq catalogue (src/content/sources.ts);
// the edition («دار ابن الجوزي») and the [placeholder] body are the design's.
const ibnKathir = tafsirSource('ibnKathir');
const tafsirSample = (status: LinkItem['status']): LinkItem => ({
  source: ibnKathir.title,
  status,
  body: '[نص تفسير ابن كثير للآية كما نُشر، دون تعديل]',
  meta: `يشرح · دار ابن الجوزي · ${ibnKathir.attribution}`,
});

export const ayahToday = {
  title: 'آية اليوم',
  sections: [
    { title: 'التفسير', count: '5', items: [tafsirSample('reviewed'), tafsirSample('suggested')], more: 'عرض التفاسير الخمسة · الطبري، السعدي، البغوي' },
    { title: 'الأحاديث', count: '5', items: [tafsirSample('reviewed'), tafsirSample('suggested')], more: 'عرض التفاسير الخمسة · الطبري، السعدي، البغوي' },
  ],
};

export const hadith = {
  title: 'صحيح البخاري · ٨',
  chapter: 'كتاب الإيمان · باب دعاؤكم إيمانكم',
  narrator: 'عن ابن عمر رضي الله عنهما قال: قال رسول الله ﷺ:',
  matn: '«بُنِيَ الإِسْلَامُ عَلَى خَمْسٍ: شَهَادَةِ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَأَنَّ مُحَمَّدًا رَسُولُ اللَّهِ، وَإِقَامِ الصَّلَاةِ، وَإِيتَاءِ الزَّكَاةِ، وَالْحَجِّ، وَصَوْمِ رَمَضَانَ»',
  evidence: 'دليل على: البقرة ٤٣ · و٣ آيات أخرى',
  gradingsTitle: 'أحكام المحدّثين',
  gradings: [
    { grader: 'البخاري', verdict: 'صحيح', tone: 'reviewed', ref: 'أخرجه في الصحيح · رقم ٨' },
    { grader: 'مسلم', verdict: 'صحيح', tone: 'reviewed', ref: 'أخرجه في الصحيح · رقم ١٦' },
    { grader: 'الترمذي', verdict: 'حسن صحيح', tone: 'suggested', ref: 'أخرجه في الصحيح · رقم ١٦' },
  ] as const,
  isnadTitle: 'الإسناد',
  isnad: [
    { name: 'رسول الله ﷺ', role: '', kind: 'prophet' },
    { name: 'عبد الله بن عمر', role: 'صحابي', kind: 'companion' },
    { name: 'عكرمة بن خالد', role: 'ثقة', kind: 'narrator' },
    { name: 'حنظلة بن أبي سفيان', role: 'ثقة', kind: 'narrator' },
    { name: 'عبيد الله بن موسى', role: 'ثقة', kind: 'narrator' },
    { name: 'البخاري', role: 'المصنِّف', kind: 'author' },
  ] as const,
  shuruhTitle: 'الشروح والروايات',
  shuruh: [
    { title: 'فتح الباري', chip: 'المرجع', tone: 'reviewed', meta: 'أخرجه في الصحيح · رقم ٨' },
    { title: 'شرح النووي على مسلم', chip: 'مقترح', tone: 'suggested', meta: 'يحيى بن شرف النووي' },
    { title: 'روايات موازية', count: '٣', meta: 'عنقود التخريج' },
  ] as const,
};

export const library = {
  title: 'المكتبة الاسلامية',
  // Every shelf in the design shows the same filler subtitle/coverage.
  shelves: ['الحديث', 'التفسير', 'الفقه وأصوله', 'العقيدة', 'السيرة والتاريخ', 'التزكية والأخلاق', 'علوم العربية', 'الأذكار'].map((title) => ({
    title,
    meta: 'الكتب التسعة ورياض الصالحين',
    coverage: '٣٠٪ مُراجَع',
    coverageFraction: 0.3,
  })),
  path: {
    label: 'مسارات التعلّم',
    title: 'أركان الإسلام من مصادرها',
    meta: 'رحلة مرتّبة عبر الآيات والأحاديث وأحكام المذاهب · ١٢٠ محطة',
  },
};

export const search = {
  title: 'ابحث',
  query: 'رحم',
  filters: ['الكل', 'القرآن', 'الحديث', 'التفسير', 'الفقه'],
  root: { letters: 'ر ح م', note: 'جذر · يجمع المشتقات دون تشكيل', words: ['ٱلرَّحِيم', 'ٱلرَّحْمَٰن', 'رَحْمَة', 'يَرْحَم'] },
  ayah: { label: 'آية', ref: 'الفاتحة · ٣', text: 'ٱلرَّحْمَٰنِ ٱلرَّحِيمِ ﴿٣﴾' },
  hadith: { label: 'حديث', ref: 'الترمذي ١٩٢٤ · أبو داود ٤٩٤١', text: '«الرَّاحِمُونَ يَرْحَمُهُمُ الرَّحْمَنُ…' },
  assistant: {
    title: 'اسأل المساعد',
    note: 'مساعد آلي — ليس مفتيًا. يجيب من نصوص المكنون فقط، ويعرض كل مصدر مع حكمه.',
    placeholder: 'اكتب سؤالك هنا',
  },
};

export type CardTint = TintName;
