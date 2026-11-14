import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Pressable } from '@/components/Tap';
import { Icon } from '@/components/Icon';
import { PageHeader } from '@/components/PageHeader';
import { Screen } from '@/components/Screen';
import { Body, Caption, Display } from '@/components/Typography';
import { Chip, GlassCard } from '@/components/ui';
import { bookMeta } from '@/content/hadith';
import { ar } from '@/content/quran';
import { colors } from '@/theme/tokens';

/**
 * A library shelf filled from the hadith books already in the app (Sunnah.com, approved, every
 * hadith with its grading): the books and chapters that belong to the subject, each opening its
 * hadith. The design's sample screen for the subject stays reachable and is labelled as a sample.
 */
type Part = { slug: string; no?: string; note?: string };
type Shelf = { title: string; intro: string; groups: { title: string; parts: Part[] }[]; sample?: { label: string; route: string }; missing?: string };
const SHELVES: Record<string, Shelf> = {
  aqeedah: {
    title: 'العقيدة',
    intro: 'أبواب الإيمان والتوحيد والقدر والسنة من كتب الحديث، كل حديث بحكمه ومصدره.',
    groups: [
      { title: 'الإيمان', parts: [{ slug: 'bukhari', no: '2' }, { slug: 'muslim', no: '1.0' }] },
      { title: 'التوحيد', parts: [{ slug: 'bukhari', no: '97' }] },
      { title: 'القدر', parts: [{ slug: 'bukhari', no: '82' }, { slug: 'muslim', no: '46.0' }] },
      { title: 'الاعتصام بالكتاب والسنة', parts: [{ slug: 'bukhari', no: '96' }, { slug: 'abudawud', no: '42' }] },
    ],
  },
  tazkiyah: {
    title: 'التزكية والأخلاق',
    intro: 'أحاديث الأدب والرقائق والبر من كتب الحديث، كل حديث بحكمه ومصدره.',
    groups: [
      { title: 'كتاب كامل', parts: [{ slug: 'adab', note: 'الأدب المفرد للبخاري' }] },
      { title: 'الرقائق', parts: [{ slug: 'bukhari', no: '81' }, { slug: 'muslim', no: '49.0' }] },
      { title: 'الأدب والبر', parts: [{ slug: 'bukhari', no: '78' }, { slug: 'muslim', no: '45.0' }, { slug: 'riyadussalihin', no: '1.0' }, { slug: 'abudawud', no: '43' }] },
      { title: 'ما نُهي عنه', parts: [{ slug: 'riyadussalihin', no: '17.0' }] },
    ],
    sample: { label: 'موضوع الصبر · مثال من التصميم', route: '/topic' },
  },
  seerah: {
    title: 'السيرة والتاريخ',
    intro: 'صفة النبي ﷺ وشمائله، ومغازيه، وفضائل أصحابه، من كتب الحديث.',
    groups: [
      { title: 'الشمائل', parts: [{ slug: 'shamail', note: 'الشمائل المحمدية للترمذي' }] },
      { title: 'بدء الوحي والمغازي', parts: [{ slug: 'bukhari', no: '1' }, { slug: 'bukhari', no: '64' }] },
      { title: 'المناقب والفضائل', parts: [{ slug: 'bukhari', no: '61' }, { slug: 'muslim', no: '43.0' }] },
      { title: 'فضائل الصحابة', parts: [{ slug: 'bukhari', no: '62' }, { slug: 'muslim', no: '44.0' }] },
    ],
    sample: { label: 'الخط الزمني · مثال من التصميم', route: '/seerah' },
  },
  arabic: {
    title: 'علوم العربية',
    intro: 'النحو والصرف والبلاغة في خدمة فهم القرآن.',
    groups: [],
    missing: 'لا يوجد بعد في التطبيق مصدر مرخّص للنحو والصرف. يُضاف بعد اعتماد مصدره ومراجعته.',
    sample: { label: 'فعل الأمر · مثال من التصميم', route: '/grammar' },
  },
};

export default function ShelfScreen() {
  const { id = 'aqeedah' } = useLocalSearchParams<{ id: string }>();
  const shelf = SHELVES[id] ?? SHELVES.aqeedah;
  return (
    <Screen backdrop="sea" withTabBar={false} header={<PageHeader title={shelf.title} fallback="/library" />}>
      <Body size={13} color="#4A4B57" lineHeight={22}>
        {shelf.intro}
      </Body>
      {shelf.missing ? (
        <GlassCard style={{ gap: 8, alignItems: 'flex-start' }}>
          <Chip label="قريبًا" tone="pending" />
          <Body size={14} color="#4A4B57" lineHeight={24}>
            {shelf.missing}
          </Body>
        </GlassCard>
      ) : null}
      {shelf.groups.map((g) => (
        <GlassCard key={g.title} style={{ paddingVertical: 8 }}>
          <Display size={17} style={{ paddingTop: 8, paddingBottom: 4 }}>
            {g.title}
          </Display>
          {g.parts.map((p) => {
            const meta = bookMeta(p.slug);
            const sec = p.no ? meta?.books.find((b) => b.no === p.no) : null;
            const count = sec ? sec.count : (meta?.count ?? 0);
            return (
              <Pressable
                key={`${p.slug}-${p.no ?? ''}`}
                accessibilityRole="link"
                onPress={() => router.push(p.no ? { pathname: '/hadith/book/[slug]', params: { slug: p.slug, section: p.no } } : `/hadith/book/${p.slug}`)}
                style={[styles.row, styles.item]}
              >
                <View style={{ flex: 1 }}>
                  <Display size={16}>{sec ? sec.name : (p.note ?? meta?.name ?? '')}</Display>
                  <Caption>{`${sec ? `${meta?.name ?? ''} · ` : ''}${ar(count)} حديثًا`}</Caption>
                </View>
                <Icon name="chevronLeft" size={18} color={colors.ink} />
              </Pressable>
            );
          })}
        </GlassCard>
      ))}
      {shelf.sample ? (
        <Pressable accessibilityRole="link" onPress={() => router.push(shelf.sample!.route as never)}>
          <Caption style={{ textAlign: 'center', color: colors.primary, paddingVertical: 6 }}>{shelf.sample.label}</Caption>
        </Pressable>
      ) : null}
      <Caption style={{ textAlign: 'center' }}>نصوص الأحاديث وأحكامها من Sunnah.com · CC BY-NC-SA 4.0</Caption>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  item: { gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.hairline },
});
