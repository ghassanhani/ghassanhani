/**
 * Row-2 screens (القرآن والحفظ · أدوات العبادة) — text copied verbatim from the
 * canvas artboards. [placeholders] are kept exactly as written.
 *
 * ⚠️ DESIGN SAMPLE. Adhkar texts, virtues, sources and gradings here are the
 * designer's draft: the canvas itself says «كل ذكر يُراجَع قبل الإطلاق». Items
 * marked `pending` show «المصدر والحكم بانتظار المراجعة».
 */
import index from '../../assets/content/quran-index.json';

export const quranIndex = index as {
  surahs: { n: number; name: string; ayat: number; type: 'مكية' | 'مدنية'; page: number }[];
  juz: { juz: number; surah: number; ayah: number; page: number }[];
};

// ── Surah index ───────────────────────────────────────────────────────
export const surahIndexScreen = {
  title: 'فهرس السور',
  searchPlaceholder: 'ابحث عن سورة أو رقم',
  tabs: ['السور', 'الأجزاء', 'محفوظاتي'],
  lastRead: { label: 'آخر موضع قراءة', title: 'الفاتحة · الآية ٥', cta: 'تابع' },
  coverageNote: 'نسبة الصلات: الآيات التي راجع العلماء صلاتها.',
  mine: [
    { title: 'الجزء ٣٠', meta: 'محفوظ كاملًا', chip: 'محفوظ', state: 'done' as const },
    { title: 'الجزء ٢٩', meta: 'من القلم إلى المرسلات', chip: 'قيد الحفظ', state: 'part' as const },
  ],
  mineCta: 'برنامج الحفظ',
};

// ── Hifz programme ────────────────────────────────────────────────────
export const hifz = {
  title: 'برنامج الحفظ',
  progress: { label: 'محفوظك', title: 'الجزء ٣٠', meta: 'كاملًا، ومن الجزء ٢٩: من القلم إلى المرسلات', mushaf: 'مصحف المدينة · ١٥ سطرًا · ٦٠٤ صفحات' },
  plan: {
    title: 'خطة اليوم',
    sub: 'ثلاثة مسارات · مصحف واحد',
    tracks: [
      { tag: 'سبق', title: 'الحفظ الجديد', when: 'بعد الفجر', what: 'سورة الملك · الآيات ١–٥', amount: 'نصف صفحة' },
      { tag: 'سبقي', title: 'المراجعة القريبة', when: 'آخر ١٤ يومًا', what: 'القلم · الحاقة · المعارج', amount: '٠ / ٣' },
      { tag: 'منزل', title: 'المراجعة البعيدة', when: 'تدور على محفوظك', what: 'الجزء ٣٠ · النصف الأول', amount: '٠ / ١' },
    ],
    start: 'ابدأ الحفظ الجديد',
    review: 'سمّع المراجعة',
  },
  lock: {
    title: 'المراجعة متأخرة يومين',
    body: 'لا ينبغي أن يسبق الجديدُ ما تقدر على مراجعته. نقترح إيقاف الحفظ الجديد حتى تلحق المراجعة.',
    pause: 'أوقف الجديد مؤقتًا',
    dismiss: 'تجاوز هذه المرة',
    paused: 'الحفظ الجديد متوقف حتى تلحق المراجعة. يمكنك استئنافه متى شئت.',
    dismissed: 'تجاوزت التنبيه اليوم. الخطة كما هي.',
  },
  map: { title: 'خريطة المصحف', legend: ['محفوظ', 'قيد الحفظ', 'لم يبدأ'] },
  pace: {
    title: 'كم يستغرق الختم؟',
    remainingPages: 563,
    options: [{ v: 0.25, label: 'ربع صفحة' }, { v: 0.5, label: 'نصف صفحة' }, { v: 1, label: 'صفحة' }],
    resultSub: 'لإتمام ما بقي من المصحف',
    note: 'القليل الدائم كل يوم أثبت من جلسات طويلة في نهاية الأسبوع.',
  },
  weak: {
    title: 'مواضع تحتاج تثبيتًا',
    items: [
      { title: 'المعارج · الآيات ١٩–٣٥', meta: 'المراجعة التالية بعد أسبوع' },
      { title: 'النبأ · الآيات ١–١٦', meta: 'المراجعة التالية بعد ٣ أيام' },
    ],
    cta: 'سمّع',
    note: 'مراجعة متباعدة: يوم · ٣ أيام · أسبوع · أسبوعان · شهر',
  },
  mutashabihat: { title: 'دفتر المتشابهات', meta: '[عدد] مواضع · منها ٢ التقطها التسميع', cta: 'تدرّب' },
  teacher: {
    title: 'المعلّم أولًا',
    meta: 'آخر جلسة · [التاريخ] · [عدد] تصويبات · المعارج',
    cta: 'سجّل جلسة',
    note: 'الاختبار الذاتي يفوته بعض الأخطاء، والخطأ المكرّر يُحفظ أيضًا. سمّع على معلّم أو رفيق بانتظام.',
  },
  slots: {
    title: 'أوقات مقترحة',
    items: [
      { title: 'الحفظ الجديد بعد الفجر', sub: 'تذكير لطيف', on: true },
      { title: 'المراجعة بعد العصر', sub: 'السبقي والمنزل', on: true },
      { title: 'التسميع قبل النوم', sub: 'ورد اليوم من الحفظ', on: true },
      { title: 'القراءة بالمحفوظ في النوافل', sub: 'تذكير في قيام الليل', on: false },
    ],
    note: 'توصيات معروفة عند أهل الحفظ، وليست قواعد.',
  },
  later: {
    title: 'برامج أخرى · لاحقًا',
    items: [
      { title: 'طريقة اللوح الموريتانية', meta: 'بعد مراجعة أهلها' },
      { title: 'الطريقة التركية', meta: 'بعد مراجعة أهلها' },
    ],
  },
  privacy: 'بياناتك على جهازك · بلا نقاط ولا مشاركة علنية',
};

export const hifzSession = {
  title: 'جلسة حفظ',
  head: { label: 'الحفظ الجديد', surah: 'سورة الملك', range: 'الآيات ١–٥', meta: 'الصفحة ٥٦٢ · الخطوة ٤ من ٥', done: 'ما أنجزته' },
  surah: 67,
  page: 562, // the mushaf page in head.meta
  steps: [
    { title: '١ · افهم أولًا', meta: 'المختصر في التفسير والترجمة للمقطع', cta: 'اقرأ' },
    { title: '٢ · استمع', meta: '[القارئ المرخّص] · ٣ مرات مع المتابعة في المصحف' },
    { title: '٣ · اربط الآيات', meta: 'آية، ثم التالية، ثم الاثنتان معًا', chain: ['١', '٢', '١+٢', '٣', '١–٣', '٤', '١–٤', '٥', '١–٥'], current: 5 },
  ],
  repeat: { title: 'كرّر · الآية ٤', ayah: 4, read: 'من المصحف', readSub: 'اضغط بعد كل قراءة', recite: 'من الحفظ', reciteSub: 'تُخفى الآية تلقائيًا', target: 20, note: 'العدد الافتراضي ٢٠ و٢٠ · قابل للتعديل', hidden: 'الآية مخفية · سمّعها من حفظك' },
  tasmee: { step: '٥', title: 'سمّع بصوتك', meta: 'الآيات مخفية · التسميع التجريبي', cta: 'ابدأ' },
  after: {
    title: 'بعد الجلسة',
    body: 'يدخل المقطع في المراجعة القريبة غدًا، ويمكنك تعليمه «ضعيفًا» لتراجعه على فترات متباعدة. وصلِّ به في نوافلك اليوم.',
    done: 'أنهيت المقطع',
    weak: 'علّمه ضعيفًا',
  },
  note: 'الخطوات من ملخّص طرق الحفظ الشائعة، وتنتظر مراجعة معلّم قرآن قبل الإطلاق.',
};

// ── Prayer ────────────────────────────────────────────────────────────
export const prayerScreen = {
  title: 'مواقيت الصلاة',
  today: 'اليوم',
  qibla: { title: 'القبلة', from: 'من الشمال', hint: 'أمسك الهاتف مستويًا وأبعده عن المعادن. الاتجاه يُحسب على جهازك.', map: 'عرض على الخريطة' },
  method: { title: 'طريقة الحساب', authority: 'الجهة', authorityValue: 'رابطة العالم الإسلامي · الفجر ١٨° والعشاء ١٧°', asr: 'وقت العصر', asrJ: 'الجمهور · ظل المثل', asrH: 'الحنفية · ظل المثلين' },
  privacy: 'تُحسب المواقيت على جهازك بمكتبة Adhan، ولا يُرسل موقعك إلى أي خادم.',
  monthTable: 'جدول الشهر',
  sunriseNote: 'لا أذان · تنبيه اختياري',
};

// ── Adhkar ────────────────────────────────────────────────────────────
type Src = { pending: true } | { src: string; chip: string } | { hadith: string; ref: string; chip: string };
import { type Grade, gradeLabel, graderName } from './hadithGrades';

const P: Src = { pending: true };
const S = (src: string, chip = 'صحيح'): Src => ({ src, chip });
export type Dhikr = { id: string; label?: string; text: string; n: number; virtue?: string; ayah?: boolean; s: Src };
export type AdhkarCat = { label: string; title: string; sub: string; items: Dhikr[] };

export const adhkarScreen = { title: 'الأذكار', now: 'الآن بعد العصر', done: 'أنجزت', mushafLink: 'اقرأ النص في المصحف', virtue: 'فضله:', pending: 'المصدر والحكم بانتظار المراجعة', note: 'العدّاد لعدد المرات فقط، لا يُحفظ ولا يُقارن. النصوص المنتهية بـ «...» تنتظر نصها الكامل، وكل ذكر يُراجَع قبل الإطلاق.' };

export const adhkar: Record<'sabah' | 'mutlaq' | 'salah' | 'nawm' | 'occ', AdhkarCat> = {
  sabah: { label: 'الصباح والمساء', title: 'أذكار الصباح والمساء', sub: 'الصباح بعد الفجر، والمساء بعد العصر', items: [
    { id: 's1', label: 'آية الكرسي · البقرة ٢٥٥', text: 'تُقرأ مرة واحدة', ayah: true, n: 1, s: P },
    { id: 's2', label: 'المعوذات', text: 'الإخلاص والفلق والناس', ayah: true, n: 3, s: P },
    { id: 's3', label: 'سيد الاستغفار', text: '«اللهم أنت ربي لا إله إلا أنت، خلقتني وأنا عبدك...»', n: 1, s: S('أخرجه البخاري') },
    { id: 's4', text: 'أصبحنا وأصبح الملك لله... / أمسينا وأمسى الملك لله...', n: 1, s: S('أخرجه مسلم') },
    { id: 's5', label: 'للمراجعة: صيغة المساء تُروى «وإليك المصير»', text: 'اللهم بك أصبحنا وبك أمسينا، وبك نحيا وبك نموت وإليك النشور', n: 1, s: S('الترمذي', '[الحكم]') },
    { id: 's6', text: 'بسم الله الذي لا يضر مع اسمه شيء في الأرض ولا في السماء وهو السميع العليم', n: 3, s: S('أبو داود والترمذي', '[الحكم]') },
    { id: 's7', text: 'رضيت بالله ربًا، وبالإسلام دينًا، وبمحمد ﷺ نبيًا', n: 3, s: P },
    { id: 's8', text: 'يا حي يا قيوم برحمتك أستغيث، أصلح لي شأني كله، ولا تكلني إلى نفسي طرفة عين', n: 1, s: P },
    { id: 's9', label: 'في المساء · للمراجعة: موضع «ثلاث مرات» في الروايات', text: 'أعوذ بكلمات الله التامات من شر ما خلق', n: 3, s: S('أخرجه مسلم') },
  ] },
  mutlaq: { label: 'الذكر المطلق', title: 'الذكر المطلق', sub: 'في أي وقت', items: [
    { id: 'm1', text: 'سبحان الله، والحمد لله، ولا إله إلا الله، والله أكبر', n: 1, virtue: 'أحبّ الكلام إلى الله', s: S('أخرجه مسلم') },
    { id: 'm2', text: 'سبحان الله وبحمده', n: 100, virtue: 'تُحطّ خطاياه وإن كانت مثل زبد البحر', s: S('متفق عليه') },
    { id: 'm3', text: 'سبحان الله وبحمده، سبحان الله العظيم', n: 1, virtue: 'خفيفتان على اللسان، ثقيلتان في الميزان، حبيبتان إلى الرحمن', s: S('متفق عليه') },
    { id: 'm4', text: 'سبحان الله وبحمده عدد خلقه، ورضا نفسه، وزنة عرشه، ومداد كلماته', n: 3, virtue: 'تعدل أذكارًا طويلة', s: S('أخرجه مسلم') },
    { id: 'm5', text: 'لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير', n: 100, virtue: 'عدل عشر رقاب، ومئة حسنة، وحرز من الشيطان', s: S('متفق عليه') },
    { id: 'm6', text: 'لا حول ولا قوة إلا بالله', n: 1, virtue: 'كنز من كنوز الجنة', s: S('متفق عليه') },
    { id: 'm7', text: 'أستغفر الله وأتوب إليه', n: 100, virtue: 'كان النبي ﷺ يستغفر في اليوم مئة مرة', s: P },
    { id: 'm8', text: 'الصلاة على النبي ﷺ', n: 1, virtue: 'من صلّى عليه واحدة صلّى الله عليه بها عشرًا', s: S('أخرجه مسلم') },
  ] },
  salah: { label: 'بعد الصلاة', title: 'أذكار ما بعد الصلاة', sub: 'بعد كل صلاة مفروضة', items: [
    { id: 'p1', text: 'أستغفر الله', n: 3, s: P },
    { id: 'p2', text: 'اللهم أنت السلام ومنك السلام، تباركت يا ذا الجلال والإكرام', n: 1, s: P },
    { id: 'p3', text: 'سبحان الله ٣٣، الحمد لله ٣٣، الله أكبر ٣٣، وتمام المئة: لا إله إلا الله وحده لا شريك له...', n: 100, s: S('أخرجه مسلم') },
    { id: 'p4', label: 'آية الكرسي · البقرة ٢٥٥', text: 'تُقرأ بعد الصلاة', ayah: true, n: 1, s: P },
    { id: 'p5', label: 'المعوذات', text: 'الإخلاص والفلق والناس', ayah: true, n: 1, s: P },
  ] },
  nawm: { label: 'النوم والاستيقاظ', title: 'أذكار النوم والاستيقاظ', sub: 'قبل النوم وعند الاستيقاظ', items: [
    { id: 'n1', label: 'قبل النوم', text: 'آية الكرسي، والمعوذات مع النفث في الكفين والمسح على الجسد ٣ مرات، وآخر آيتين من سورة البقرة', ayah: true, n: 3, s: P },
    { id: 'n2', label: 'تسبيح فاطمة', text: 'سبحان الله ٣٣، الحمد لله ٣٣، الله أكبر ٣٤', n: 100, s: S('متفق عليه') },
    { id: 'n3', text: 'باسمك اللهم أموت وأحيا', n: 1, s: P },
    { id: 'n4', label: 'عند الاستيقاظ', text: 'الحمد لله الذي أحيانا بعد ما أماتنا وإليه النشور', n: 1, s: S('أخرجه البخاري') },
  ] },
  occ: { label: 'المناسبات', title: 'أذكار المناسبات اليومية', sub: 'الطعام والخروج والمسجد والسفر واللباس', items: [
    { id: 'o1', label: 'الطعام', text: '«بسم الله» في أوله، و«الحمد لله» بعد الفراغ منه', n: 1, s: P },
    { id: 'o2', label: 'الخروج من المنزل', text: 'بسم الله، توكلت على الله، ولا حول ولا قوة إلا بالله', n: 1, s: P },
    { id: 'o3', label: 'المسجد', text: 'الدخول: اللهم افتح لي أبواب رحمتك. الخروج: اللهم إني أسألك من فضلك', n: 1, s: P },
    { id: 'o4', label: 'الخلاء', text: 'الدخول: اللهم إني أعوذ بك من الخبث والخبائث. الخروج: غفرانك', n: 1, s: P },
    { id: 'o5', label: 'الركوب · من سورة الزخرف', text: 'سبحان الذي سخّر لنا هذا وما كنا له مقرنين، وإنا إلى ربنا لمنقلبون', ayah: true, n: 1, s: P },
    { id: 'o6', label: 'لبس الثوب', text: 'الحمد لله الذي كساني هذا ورزقنيه من غير حول مني ولا قوة', n: 1, s: P },
  ] },
};
export const adhkarOrder = ['sabah', 'mutlaq', 'salah', 'nawm', 'occ'] as const;

// Each dhikr found in its hadith (pipeline/importers/adhkar, from the verified Sunnah.com packs)
// takes its wording verbatim from that hadith, with the hadith's reference and grading; the rest
// keep their place and stay marked for review.
const fromHadith = (require('../../assets/content/adhkar.json') as { adhkar: Record<string, { id: string; text: string; hadith: string; ref: string; grades: Grade[] }[]> }).adhkar;
const toArabicDigits = (t: string) => t.replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);
for (const [cat, list] of Object.entries(fromHadith)) {
  const items = adhkar[cat as keyof typeof adhkar]?.items;
  if (!items) continue;
  for (const x of list) {
    const d = items.find((i) => i.id === x.id);
    if (!d) continue;
    const [book] = x.hadith.split(':');
    // a grading as the source gives it (Al-Albani first when there are several); the two Sahihs carry none
    const g = [...x.grades].sort((a) => (/albani|الألباني/i.test(a.by) ? -1 : 1))[0];
    d.text = x.text;
    d.s = { hadith: x.hadith, ref: toArabicDigits(x.ref), chip: g ? `${gradeLabel(g)} · ${graderName(g)}` : book === 'bukhari' || book === 'muslim' ? 'في الصحيح' : 'بلا حكم في المصدر' };
  }
}

// ── Zakat ─────────────────────────────────────────────────────────────
export const zakatScreen = {
  title: 'حاسبة الزكاة',
  dueLabel: 'الزكاة الواجبة · ٢٫٥٪',
  net: 'صافي الأموال الزكوية',
  nisab: 'النصاب',
  noPrice: 'أدخل سعر الغرام لحساب النصاب',
  due: 'بلغ مالك النصاب',
  notDue: 'لم يبلغ مالك النصاب، فلا زكاة عليه',
  basisTitle: 'أساس النصاب',
  gold: 'الذهب · ٨٥ غ',
  silver: 'الفضة · ٥٩٥ غ',
  goldPrice: 'غرام الذهب (€)',
  silverPrice: 'غرام الفضة (€)',
  sampleNote: 'الأسعار قيم مثال · أدخل سعر اليوم',
  assetsTitle: 'أموالك التي حال عليها الحول',
  fields: [
    { key: 'cash', label: 'نقد وأرصدة بنكية', unit: '€', hint: 'الحسابات الجارية والادخار والنقد في اليد' },
    { key: 'gold', label: 'ذهب', unit: 'غرام', hint: 'يُقوَّم بسعر الغرام أعلاه' },
    { key: 'silver', label: 'فضة', unit: 'غرام', hint: 'يُقوَّم بسعر الغرام أعلاه' },
    { key: 'trade', label: 'أسهم وعروض تجارة', unit: '€', hint: 'بقيمتها السوقية يوم الحساب' },
    { key: 'owed', label: 'ديون مستحقة لك', unit: '€', hint: 'المرجوّ تحصيلها' },
    { key: 'debt', label: 'ديون عليك', unit: '€', hint: 'الحالّة الآن، تُخصم من المجموع' },
  ] as const,
  // Example values from the design («الأسعار قيم مثال»).
  sample: { cash: '12000', gold: '50', silver: '0', trade: '3000', owed: '1000', debt: '2000', gp: '100', sp: '1' },
  madhhabs: {
    title: 'أحكام الزكاة في المذاهب الأربعة',
    body: 'تختلف المذاهب في مسائل منها: ضمّ الذهب إلى الفضة، وزكاة الحليّ المستعمل، وخصم الديون. الحاسبة تتبع قولًا واحدًا مُعلَنًا.',
    cta: 'اقرأ الأقوال وأدلتها',
  },
  disclaimer: 'معلومة وليست فتوى · راجع عالمًا لحالتك.',
};

// ── Inheritance (example only — the engine is not approved yet) ──────
export const inheritanceScreen = {
  title: 'حاسبة المواريث',
  beta: 'تجريبي · لم تُعتمد بعد من المراجِع الشرعي',
  betaBody: 'النتائج للتعلّم فقط. لا تُقسَم تركة على أساسها قبل مراجعة عالم أو محكمة مختصة.',
  caseTitle: 'المسألة',
  madhhabTitle: 'المذهب',
  madhhabs: [['hanafi', 'الحنفي'], ['maliki', 'المالكي'], ['shafii', 'الشافعي'], ['hanbali', 'الحنبلي']] as const,
  estateLabel: 'قيمة التركة بعد التجهيز والديون والوصية (€)',
  heirsTitle: 'الورثة',
  heirs: [
    { key: 'husband', label: 'زوج', hint: 'حدّ أقصى ١', max: 1 },
    { key: 'wife', label: 'زوجة', hint: 'حتى ٤', max: 4 },
    { key: 'son', label: 'أبناء', hint: '', max: 20 },
    { key: 'daughter', label: 'بنات', hint: '', max: 20 },
    { key: 'father', label: 'أب', hint: '', max: 1 },
    { key: 'mother', label: 'أم', hint: '', max: 1 },
    { key: 'brother', label: 'إخوة أشقاء', hint: '', max: 20 },
  ] as const,
  example: {
    title: 'الأنصبة',
    sub: 'مثال: زوجة + ابن + بنت',
    counts: { husband: 0, wife: 1, son: 1, daughter: 1, father: 0, mother: 0, brother: 0 },
    rows: [
      { heir: 'الزوجة', basis: 'فرضًا', share: '١/٨', fraction: 1 / 8 },
      { heir: 'الابن', basis: 'تعصيبًا', share: '٧/١٢', fraction: 7 / 12 },
      { heir: 'البنت', basis: 'تعصيبًا', share: '٧/٢٤', fraction: 7 / 24 },
    ],
    explain: 'للزوجة الثُّمن لوجود الفرع الوارث، والباقي (٧/٨) للابن والبنت تعصيبًا، للذكر مثل حظ الأنثيين.',
    evidence: 'الدليل: النساء ١١–١٢ وصلاتهما',
    match: 'تتوافق المذاهب الأربعة في هذه المسألة.',
    notEnabled: 'الجدول يعرض المثال فقط. الحساب لكل الحالات يُفعَّل بعد اعتماد المحرك.',
  },
  defaultEstate: '120000',
  defaultMadhhab: 'shafii',
  disclaimer: 'معلومة وليست فتوى · ستُعتمد الحاسبة بعد اختبارها على مسائل يراجعها عالم.',
};
