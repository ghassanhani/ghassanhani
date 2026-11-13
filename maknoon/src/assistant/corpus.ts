import searchIndex from '../../assets/content/quran-search.json';
import { adhkar, adhkarOrder, quranIndex } from '@/content/worship';
import { fiqh, grammar, topic, usul } from '@/content/modules';
import { hadith } from '@/content/design';
import { fold } from './normalize';
import { ar } from '@/content/quran';

/**
 * Everything the assistant may cite. Each item is a node with a stable id; the
 * assistant only ever points at these — it never writes Quran or hadith text.
 */
export type Node = {
  id: string; // 'ayah:3:3', 'dhikr:m2', 'fiqh:mash-ras' …
  kind: 'ayah' | 'hadith' | 'dhikr' | 'fiqh' | 'topic' | 'usul' | 'grammar' | 'tafsir';
  title: string; // label shown on the card
  ref: string; // reference line
  route: string | null;
  tone: 'reviewed' | 'suggested' | 'pending' | null; // review status shown on the card
  chip?: string;
  text?: string; // canonical display text (ayah/hadith/dhikr), rendered verbatim
  norm: string; // normalized searchable text
  surah?: number;
  ayah?: number;
};

const SEARCH = searchIndex as Record<string, string>;
const surahName = (n: number) => quranIndex.surahs[n - 1]?.name ?? String(n);

// Quran: every ayah is searchable (plain spelling); cards render the Uthmani text.
export const ayatNodes: Node[] = Object.entries(SEARCH).map(([k, t]) => {
  const [s, a] = k.split(':').map(Number);
  return { id: `ayah:${k}`, kind: 'ayah', title: 'آية', ref: `${surahName(s)} · ${ar(a)}`, route: `/ayah/${k}`, tone: null, norm: fold(t), surah: s, ayah: a };
});

// Curated nodes from the app's modules (design-sample content; statuses as shown there).
const curated: Node[] = [
  {
    id: 'hadith:bukhari-8',
    kind: 'hadith',
    title: hadith.title,
    ref: hadith.chapter,
    route: '/hadith/bukhari-8',
    tone: 'reviewed',
    chip: 'صحيح · البخاري ومسلم',
    text: hadith.matn,
    norm: fold(`${hadith.matn} ${hadith.chapter} اركان الاسلام الشهاده الصلاه الزكاه الحج الصوم رمضان`),
  },
  {
    id: 'hadith:rahimun',
    kind: 'hadith',
    title: 'حديث',
    ref: 'الترمذي ١٩٢٤ · أبو داود ٤٩٤١',
    route: null,
    tone: 'reviewed',
    chip: 'حسن صحيح · الترمذي',
    text: '«الرَّاحِمُونَ يَرْحَمُهُمُ الرَّحْمَنُ…»',
    norm: fold('رحمه الرحمه بالخلق رحم'),
  },
  {
    id: 'fiqh:mash-ras',
    kind: 'fiqh',
    title: fiqh.issue,
    ref: `${fiqh.section} · ${fiqh.disputed}`,
    route: '/fiqh',
    tone: 'reviewed',
    norm: fold(`${fiqh.issue} ${fiqh.section} مسح الراس الوضوء الطهاره ${fiqh.madhhabs.map((m) => m.pos).join(' ')}`),
  },
  { id: 'usul:amr', kind: 'usul', title: usul.hero.title, ref: usul.hero.label, route: '/usul', tone: 'reviewed', norm: fold(`${usul.hero.title} ${usul.definition.brief} الامر الوجوب اصول الفقه`) },
  { id: 'topic:sabr', kind: 'topic', title: topic.hero.title, ref: topic.hero.label, route: '/topic', tone: null, norm: fold(`الصبر صبر الصابرين ${topic.hero.body}`) },
  { id: 'grammar:amr', kind: 'grammar', title: grammar.rule, ref: grammar.label, route: '/grammar', tone: 'reviewed', norm: fold(`فعل الامر نحو اعراب ${grammar.quote}`) },
  ...adhkarOrder.flatMap((c) =>
    adhkar[c].items.map<Node>((d) => ({
      id: `dhikr:${d.id}`,
      kind: 'dhikr',
      title: d.label ?? adhkar[c].title,
      ref: 'pending' in d.s ? 'المصدر والحكم بانتظار المراجعة' : 'hadith' in d.s ? d.s.ref : d.s.src,
      route: 'hadith' in d.s ? `/hadith/${d.s.hadith}` : '/adhkar',
      tone: 'pending' in d.s ? 'pending' : /صحيح/.test(d.s.chip) ? 'reviewed' : 'pending',
      chip: 'pending' in d.s ? undefined : d.s.chip,
      text: d.text,
      norm: fold(`${d.text} ${d.label ?? ''} ${d.virtue ?? ''} ${adhkar[c].title} ذكر اذكار`),
    })),
  ),
];

export const curatedNodes = curated;
export const surahLabel = surahName;
