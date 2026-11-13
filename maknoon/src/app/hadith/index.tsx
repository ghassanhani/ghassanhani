import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { PageHeader } from '@/components/PageHeader';
import { Screen } from '@/components/Screen';
import { Body, Caption, Display } from '@/components/Typography';
import { GlassCard } from '@/components/ui';
import { hadithIndex } from '@/content/hadith';
import { ar } from '@/content/quran';
import { colors } from '@/theme/tokens';

/** The hadith books (Sunnah.com), each opening its sections. All bundled: they open without a network. */
export default function HadithBooks() {
  return (
    <Screen backdrop="dune" withTabBar={false} header={<PageHeader title="كتب الحديث" fallback="/library" />}>
      <Body size={13} color="#4A4B57">
        نصوص الأحاديث وأحكامها كما في Sunnah.com، وكل حكم منسوب إلى من حكم به.
      </Body>
      {hadithIndex.books.map((b) => (
        <Pressable key={b.slug} accessibilityRole="button" onPress={() => router.push(`/hadith/book/${b.slug}`)}>
          <GlassCard style={styles.row}>
            <View style={{ flex: 1, gap: 2 }}>
              <Display size={19}>{b.name}</Display>
              <Caption>{`${ar(b.count)} حديثًا · ${ar(b.books.length)} كتابًا${b.graded ? ` · ${ar(b.graded)} بحكم` : ''}`}</Caption>
            </View>
            <Body size={20} color={colors.primary}>
              ‹
            </Body>
          </GlassCard>
        </Pressable>
      ))}
      <Caption style={{ textAlign: 'center' }}>{`المصدر: ${hadithIndex._credit} · ${hadithIndex._license}`}</Caption>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 },
});
