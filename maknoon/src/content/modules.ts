/**
 * Row-3 knowledge modules (وحدات المعرفة) — copied verbatim from the canvas.
 * [placeholders] stay exactly as written; Quran and hadith snippets are the
 * design's own strings. ⚠️ DESIGN SAMPLE: positions, references and status
 * chips must be replaced by reviewed data before release.
 */
export type Tone = 'reviewed' | 'suggested' | 'pending';

export const fiqh = {
  title: 'مسألة فقهية',
  crumbs: ['الفقه', 'الطهارة', 'الوضوء'],
  disputed: 'فيها خلاف',
  section: 'الطهارة · الوضوء',
  issue: 'القدر المُجزئ في مسح الرأس في الوضوء',
  stats: [
    { n: '٤', label: 'أقوال للمذاهب' },
    { n: '٢', label: 'دليلان' },
    { n: '١', label: 'سبب خلاف' },
  ],
  mineToggle: { title: 'عرض مذهبي أولًا', sub: 'مذهبك: الشافعي · تبقى المذاهب كلها ظاهرة', mineId: 's', mineChip: 'مذهبي' },
  madhhabs: [
    { id: 'h', name: 'الحنفية', pos: 'يُجزئ مسح ربع الرأس.', ref: 'الهداية' },
    { id: 'm', name: 'المالكية', pos: 'يجب مسح جميع الرأس.', ref: 'مختصر خليل' },
    { id: 's', name: 'الشافعية', pos: 'يُجزئ أقل ما يقع عليه اسم المسح، ولو بعض شعرة.', ref: 'منهاج الطالبين' },
    { id: 'b', name: 'الحنابلة', pos: 'يجب مسح جميع الرأس في المذهب.', ref: 'زاد المستقنع' },
  ],
  refSuffix: ' · [الجزء/الصفحة]',
  evidenceTitle: 'الأدلة',
  evidence: [
    { kind: 'quran' as const, label: 'من القرآن · المائدة ٦', text: '﴿وَٱمْسَحُوا۟ بِرُءُوسِكُمْ﴾', note: 'دليل لجميع الأقوال، واختلفوا في دلالته', route: '/ayah/5:6' },
    { kind: 'hadith' as const, label: 'من السنة · صحيح مسلم · [رقم]', text: '[حديث المسح على الناصية والعمامة]', chip: 'صحيح · مسلم', note: 'استدلّ به من قال بإجزاء البعض', route: null },
  ],
  cause: {
    title: 'سبب الخلاف',
    intro: 'الاشتراك في معنى الباء في',
    word: '﴿بِرُءُوسِكُمْ﴾',
    branches: [
      { tag: 'زائدة', meaning: 'للإلصاق والتأكيد', result: 'فيجب مسح الرأس كله', color: '#035A5F' },
      { tag: 'للتبعيض', meaning: 'بمعنى «بعض»', result: 'فيُجزئ مسح بعضه', color: '#3AAADA' },
    ],
    source: 'بداية المجتهد · ابن رشد · [الجزء/الصفحة]',
  },
  usul: { label: 'من أصول الفقه', title: 'دلالة حروف المعاني على الأحكام', sub: 'كيف يغيّر معنى الحرف الواحد الحكم' },
  disclaimer: 'هذه معلومة وليست فتوى. للعمل في حالتك اسأل عالمًا تثق به.',
};

export const usul = {
  title: 'أصول الفقه',
  crumbs: ['أصول الفقه', 'الأمر'],
  hero: { label: 'أصل فقهي · باب الأمر', title: 'الأمر المطلق يقتضي الوجوب', sub: 'قول الجمهور · تُستنبط به أحكام كثيرة' },
  definition: {
    title: 'التعريف',
    quote: '«والأمر: استدعاء الفعل بالقول ممن هو دونه على سبيل الوجوب»',
    source: 'الورقات · إمام الحرمين الجويني · [الصفحة]',
    briefTitle: 'معناه باختصار',
    brief: 'إذا ورد الأمر في القرآن أو السنة مجرّدًا عن قرينة تصرفه، حُمل على الوجوب. فإن وُجدت قرينة صرفته إلى الندب أو الإباحة. وفي المسألة أقوال أخرى عند الأصوليين تُعرض في الشروح.',
  },
  appliedTitle: 'مسائل مبنية عليه',
  appliedMore: 'و[عدد] مسألة أخرى في المكنون',
  applied: [
    { tag: 'آية', title: 'وجوب الصلوات الخمس', meta: 'البقرة ٤٣ · ﴿وَأَقِيمُوا۟ ٱلصَّلَوٰةَ﴾', route: '/ayah/2:43' },
    { tag: 'فقه', title: 'وجوب مسح الرأس في الوضوء', meta: 'مع الخلاف في القدر المجزئ', route: '/fiqh' },
  ],
  maximsTitle: 'القواعد الفقهية الكبرى',
  maximsSource: 'الأشباه والنظائر · [الصفحة]',
  maxims: ['الأمور بمقاصدها', 'اليقين لا يزول بالشك', 'المشقة تجلب التيسير', 'الضرر يُزال', 'العادة محكّمة'],
  maqasid: {
    title: 'مقاصد الشريعة',
    sub: 'الضروريات الخمس',
    items: [
      { name: 'الدين', color: '#035A5F' },
      { name: 'النفس', color: '#3AAADA' },
      { name: 'العقل', color: '#7D7FC5' },
      { name: 'النسل', color: '#C57D7E' },
      { name: 'المال', color: '#B8975A' },
    ],
    verb: 'حفظ',
    source: 'المرجع: الموافقات للشاطبي',
  },
  path: { label: 'ادرسه في سياقه', title: 'مدخل إلى أصول الفقه مع الورقات' },
};

export const narrator = {
  title: 'ترجمة راوٍ',
  initial: 'ع',
  name: 'عبد الله بن عمر بن الخطاب',
  sub: 'رضي الله عنهما · أبو عبد الرحمن',
  chips: [
    { label: 'صحابي', tone: 'reviewed' as Tone, badge: true },
    { label: 'تُوفي بمكة سنة ٧٣هـ، وقيل ٧٤هـ', tone: 'suggested' as Tone },
  ],
  stats: [
    { n: '[عدد]', label: 'رواية في المكنون' },
    { n: '[عدد]', label: 'في الكتب التسعة' },
    { n: '[عدد]', label: 'تلميذ' },
  ],
  jarh: { title: 'الجرح والتعديل', body: 'الصحابة كلهم عدول عند أهل السنة، فلا يُبحث في عدالتهم.' },
  network: {
    title: 'شيوخه وتلاميذه',
    fromLabel: 'روى عن',
    teachers: [
      { name: 'النبي ﷺ', sub: '' },
      { name: 'عمر بن الخطاب', sub: 'أبوه' },
    ],
    self: 'عبد الله بن عمر',
    students: [
      { name: 'نافع', sub: 'مولى ابن عمر' },
      { name: 'سالم', sub: 'ابنه' },
    ],
    toLabel: 'روى عنه · و[عدد] آخرون',
  },
  narrations: {
    title: 'رواياته في المكنون',
    all: 'عرض الكل',
    items: [
      { text: '«بُنِيَ الإِسْلَامُ عَلَى خَمْسٍ…»', chip: 'صحيح · البخاري ومسلم', ref: 'البخاري ٨', route: '/hadith/bukhari:8' },
      { text: '[رواية أخرى لابن عمر · نصّ من مصدر مرخّص]', chip: null, ref: '[المصدر · الرقم]', route: null },
    ],
  },
  sources: { title: 'مصادر الترجمة', body: '[الإصابة · تهذيب التهذيب · الجزء/الصفحة]' },
};

export const seerah = {
  title: 'السيرة النبوية',
  intro: 'خط زمني، كل حدث موصول بآياته وأحاديثه وأعلامه.',
  filters: [
    { id: 'all', label: 'الكل' },
    { id: 'battle', label: 'غزوات' },
    { id: 'event', label: 'أحداث' },
    { id: 'people', label: 'أعلام' },
  ] as const,
  events: [
    { t: 'مولد النبي ﷺ', d: 'عام الفيل · نحو ٥٧١م', k: 'event', a: '٢', h: '٣', p: '٤' },
    { t: 'البعثة', d: 'نحو ٦١٠م', k: 'event', a: '٥', h: '٤', p: '٣' },
    { t: 'الهجرة إلى المدينة', d: '١هـ · ٦٢٢م', k: 'event', a: '٦', h: '٨', p: '٧' },
    { t: 'غزوة بدر', d: '٢هـ · ٦٢٤م', k: 'battle', a: '١٢', h: '٩', p: '١٥' },
    { t: 'غزوة أحد', d: '٣هـ · ٦٢٥م', k: 'battle', a: '١٠', h: '٧', p: '١١' },
    { t: 'غزوة الخندق', d: '٥هـ · ٦٢٧م', k: 'battle', a: '٨', h: '٥', p: '٦' },
    { t: 'صلح الحديبية', d: '٦هـ · ٦٢٨م', k: 'event', a: '٥', h: '٦', p: '٥' },
    { t: 'فتح مكة', d: '٨هـ · ٦٣٠م', k: 'battle', a: '٣', h: '٧', p: '٦' },
    { t: 'حجة الوداع', d: '١٠هـ · ٦٣٢م', k: 'event', a: '٤', h: '١٠', p: '٣' },
    { t: 'وفاة النبي ﷺ', d: '١١هـ · ٦٣٢م', k: 'event', a: '٢', h: '٨', p: '٤' },
  ],
  badrIndex: 3,
  badr: {
    ayatLabel: 'آيات',
    ayat: ['آل عمران ١٢٣', 'سورة الأنفال'],
    peopleLabel: 'أعلام',
    people: ['حمزة بن عبد المطلب', 'علي بن أبي طالب', '+ [عدد]'],
    place: 'المكان: بدر · [المصدر: كتب السيرة]',
  },
  otherOpen: '[آيات الحدث وأحاديثه وأعلامه · من قاعدة البيانات]',
  note: 'التواريخ الميلادية تقريبية. أعداد الصلات للعرض فقط.',
};

export const topic = {
  title: 'التزكية',
  hero: {
    label: 'أعمال القلوب',
    title: 'الصبر',
    body: 'من أعمال القلوب. هنا آياته وأحاديثه المخرّجة وكلام العلماء فيه، كل صلة بمصدرها وحالة مراجعتها.',
    counts: ['[عدد] آيات', '[عدد] أحاديث', '[عدد] نصوص للعلماء'],
  },
  quran: {
    title: 'من القرآن',
    items: [
      { text: '﴿إِنَّمَا يُوَفَّى ٱلصَّٰبِرُونَ أَجْرَهُم بِغَيْرِ حِسَابٍ﴾', ref: 'الزمر · ١٠', tone: 'reviewed' as Tone, route: '/ayah/39:10', quran: true },
      { text: '[آية من قاعدة البيانات]', ref: '[السورة · الآية]', tone: 'suggested' as Tone, route: null, quran: false },
    ],
  },
  sunnah: {
    title: 'من السنة',
    items: [{ text: '«عَجَبًا لِأَمْرِ الْمُؤْمِنِ، إِنَّ أَمْرَهُ كُلَّهُ خَيْرٌ…»', chip: 'صحيح · مسلم', ref: 'صحيح مسلم · [رقم]' }],
  },
  scholars: {
    title: 'من كلام العلماء',
    items: [
      { book: 'مدارج السالكين', author: 'ابن القيم', tone: 'reviewed' as Tone, excerpt: '[مقتطف من منزلة الصبر]', ref: '[الطبعة] · [الجزء/الصفحة]' },
      { book: 'مختصر منهاج القاصدين', author: 'ابن قدامة', tone: 'suggested' as Tone, excerpt: '[مقتطف من كتاب الصبر والشكر]', ref: '[الطبعة] · [الصفحة]' },
    ],
  },
  reflect: {
    title: 'تأمّل اختياري',
    prompt: 'ما موقف مرّ بك هذا الأسبوع احتجت فيه إلى الصبر؟ دوّن خاطرة قصيرة لنفسك.',
    placeholder: 'خاطرتك… تبقى على جهازك',
  },
  relatedTitle: 'مواضيع قريبة',
  related: ['الشكر', 'التوبة', 'الإخلاص', 'الرضا'],
};

export const grammar = {
  title: 'علوم العربية',
  crumbs: ['علوم العربية', 'النحو'],
  label: 'قاعدة نحوية · الآجرومية · باب الأفعال',
  rule: 'فعل الأمر',
  quote: '«والأمرُ مجزومٌ أبدًا»',
  opinionsTitle: 'قولان في المسألة',
  opinions: [
    { school: 'الآجرومية', tone: 'num' as const, verdict: 'مجزوم', note: 'على ما في الآجرومية: الأمر مجزوم.' },
    { school: 'البصريون', tone: 'suggested' as const, verdict: 'مبنيّ', note: 'على ما يُجزم به مضارعه.' },
  ],
  examplesTitle: 'أمثلة من القرآن',
  examples: [
    { word: 'أَقِيمُوا۟', ref: 'البقرة · ٤٣', note: 'حُذفت النون والواو فاعل', route: '/ayah/2:43' },
    { word: 'ٱهْدِنَا', ref: 'الفاتحة · ٦', note: 'فعل أمر خرج إلى الدعاء', route: '/ayah/1:6' },
  ],
  more: '+ [عدد] آيات أخرى بالقاعدة نفسها',
  lexicon: { source: 'مفردات ألفاظ القرآن · الراغب', root: 'ق و م', excerpt: '[مقتطف من مادة «قوم»]', ref: '[الطبعة] · [الصفحة]' },
  matnTitle: 'موضعها في المتن',
  matn: [
    { title: 'الآجرومية', meta: 'باب الأفعال · المتن الأول', link: false },
    { title: 'القاعدة التالية', meta: 'المضارع وإعرابه', link: true },
  ],
};

export const path = {
  title: 'مسار التعلّم',
  hero: {
    label: 'مسارات التعلّم',
    title: 'أركان الإسلام من مصادرها',
    body: '١٢ محطة تمشي بك بين الآيات والأحاديث. ابدأ من أي محطة، وأتمّها حين تفرغ منها.',
    saved: 'تقدّمك محفوظ على جهازك',
    total: 12,
  },
  done: 'أنجزتها',
  markDone: 'أتممت هذه المحطة',
  undo: 'لم أتمّها',
  // Each step opens a real node: an ayah (with its tafsir), a hadith (Sunnah.com, with its grading),
  // or a tool. Labels describe; the texts themselves are read on the node, never typed here.
  // Rulings of the madhhabs join each station once their reviewed sources exist.
  stations: [
    { title: 'الشهادتان', steps: [
      { tag: 'آ', text: 'آل عمران ١٨ · شهادة التوحيد', route: '/ayah/3:18' },
      { tag: 'آ', text: 'محمد ١٩ · العلم بالتوحيد', route: '/ayah/47:19' },
      { tag: 'ح', text: 'حديث جبريل في الإسلام والإيمان والإحسان · صحيح مسلم ٨', route: '/hadith/muslim:8' },
      { tag: 'ح', text: 'بناء الإسلام على خمس · صحيح البخاري ٨', route: '/hadith/bukhari:8' },
    ] },
    { title: 'الطهارة مفتاح الصلاة', steps: [
      { tag: 'آ', text: 'المائدة ٦ · آية الوضوء', route: '/ayah/5:6' },
      { tag: 'ح', text: 'مفتاح الصلاة الطهور · جامع الترمذي ٣', route: '/hadith/tirmidhi:3' },
      { tag: 'ح', text: 'لا تُقبل صلاة المحدث حتى يتوضأ · صحيح البخاري ١٣٥', route: '/hadith/bukhari:135' },
      { tag: 'ك', text: 'أحاديث الطهارة من بلوغ المرام', route: '/hadith/book/bulugh?section=1' },
    ] },
    { title: 'الصلاة: فرضها وأوقاتها', steps: [
      { tag: 'آ', text: 'النساء ١٠٣ · الصلاة كتاب موقوت', route: '/ayah/4:103' },
      { tag: 'آ', text: 'البقرة ٢٣٨ · المحافظة على الصلوات', route: '/ayah/2:238' },
      { tag: 'ح', text: 'تعليم أوقات الصلاة · صحيح مسلم ٦١٣', route: '/hadith/muslim:613' },
    ], cta: { label: 'مواقيت الصلاة في مدينتك', route: '/prayer' } },
    { title: 'الصلاة: أركانها وسننها', steps: [
      { tag: 'ح', text: 'صلّوا كما رأيتموني أصلي · صحيح البخاري ٦٣١', route: '/hadith/bukhari:631' },
      { tag: 'ح', text: 'حديث المسيء صلاته · صحيح البخاري ٧٥٧', route: '/hadith/bukhari:757' },
    ] },
    { title: 'الزكاة', steps: [
      { tag: 'آ', text: 'البقرة ٤٣ · الأمر بالزكاة', route: '/ayah/2:43' },
      { tag: 'آ', text: 'التوبة ١٠٣ · خذ من أموالهم صدقة', route: '/ayah/9:103' },
    ], cta: { label: 'جرّب حاسبة الزكاة', route: '/zakat' } },
    { title: 'الزكاة: الأموال والنصاب', steps: [
      { tag: 'ح', text: 'ما دون النصاب لا زكاة فيه · صحيح البخاري ١٤٤٧', route: '/hadith/bukhari:1447' },
    ], cta: { label: 'احسب زكاتك', route: '/zakat' } },
    { title: 'الصيام', steps: [
      { tag: 'آ', text: 'البقرة ١٨٣ · فرض الصيام', route: '/ayah/2:183' },
      { tag: 'ح', text: 'فضل صيام رمضان · صحيح البخاري ٣٨', route: '/hadith/bukhari:38' },
    ] },
    { title: 'رمضان وقيامه', steps: [
      { tag: 'آ', text: 'البقرة ١٨٥ · شهر رمضان', route: '/ayah/2:185' },
      { tag: 'ح', text: 'فضل قيام رمضان · صحيح البخاري ٣٧', route: '/hadith/bukhari:37' },
    ] },
    { title: 'الحج: فرضه وشروطه', steps: [
      { tag: 'آ', text: 'آل عمران ٩٧ · فرض الحج على المستطيع', route: '/ayah/3:97' },
      { tag: 'ح', text: 'إعلان فرض الحج · صحيح مسلم ١٣٣٧', route: '/hadith/muslim:1337' },
    ] },
    { title: 'مناسك الحج', steps: [
      { tag: 'آ', text: 'البقرة ١٩٦–١٩٧ · أحكام الحج', route: '/ayah/2:196' },
      { tag: 'ح', text: 'حديث جابر في صفة حجة النبي ﷺ · صحيح مسلم ١٢١٨', route: '/hadith/muslim:1218' },
      { tag: 'ك', text: 'أحاديث الحج من بلوغ المرام', route: '/hadith/book/bulugh?section=6' },
    ] },
    { title: 'العمرة', steps: [
      { tag: 'آ', text: 'البقرة ١٩٦ · إتمام الحج والعمرة', route: '/ayah/2:196' },
      { tag: 'ح', text: 'العمرة إلى العمرة كفارة · صحيح البخاري ١٧٧٣', route: '/hadith/bukhari:1773' },
    ] },
    { title: 'أثر الأركان في القلب', steps: [
      { tag: 'آ', text: 'العنكبوت ٤٥ · الصلاة تنهى عن الفحشاء', route: '/ayah/29:45' },
      { tag: 'ح', text: 'إنما الأعمال بالنيات · صحيح البخاري ١', route: '/hadith/bukhari:1' },
    ] },
  ] as { title: string; steps: { tag: string; text: string; route: string }[]; cta?: { label: string; route: string } }[],
};

