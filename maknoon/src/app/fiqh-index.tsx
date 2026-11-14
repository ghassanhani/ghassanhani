import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Pressable } from '@/components/Tap';
import { Icon } from '@/components/Icon';
import { PageHeader } from '@/components/PageHeader';
import { Screen } from '@/components/Screen';
import { Body, Caption, Display } from '@/components/Typography';
import { Chip, GlassCard } from '@/components/ui';
import { colors } from '@/theme/tokens';

/**
 * «الفقه وأصوله»: the chapters of fiqh as they will be filled. Today only one issue exists, the
 * design's sample (in الطهارة), and it says so; every other chapter reads «قريبًا» until its
 * issues are written from their sources and reviewed (CLAUDE.md rules 3–4).
 */
const CHAPTERS: { title: string; sub?: string; route?: string }[] = [
  { title: 'الطهارة', sub: 'مسألة واحدة · مثال من التصميم', route: '/fiqh' },
  { title: 'الصلاة' },
  { title: 'الزكاة' },
  { title: 'الصيام' },
  { title: 'الحج والعمرة' },
  { title: 'المعاملات' },
  { title: 'النكاح والأسرة' },
  { title: 'الأطعمة والأيمان' },
];

export default function FiqhIndexScreen() {
  return (
    <Screen backdrop="sea" withTabBar={false} header={<PageHeader title="الفقه وأصوله" fallback="/library" />}>
      <Body size={13} color="#4A4B57" lineHeight={22}>
        تُعرض كل مسألة بأقوال المذاهب الأربعة وأدلتها من مصادرها، ولا تُنشر إلا بعد مراجعتها.
      </Body>
      <GlassCard style={{ paddingVertical: 8 }}>
        <Display size={17} style={{ paddingTop: 8, paddingBottom: 4 }}>
          أبواب الفقه
        </Display>
        {CHAPTERS.map((c) => (
          <Pressable key={c.title} accessibilityRole={c.route ? 'link' : 'text'} disabled={!c.route} onPress={() => c.route && router.push(c.route as never)} style={[styles.row, styles.item]}>
            <View style={{ flex: 1 }}>
              <Display size={16} color={c.route ? colors.ink : colors.muted}>
                {c.title}
              </Display>
              {c.sub ? <Caption>{c.sub}</Caption> : null}
            </View>
            {c.route ? <Icon name="chevronLeft" size={18} color={colors.ink} /> : <Chip label="قريبًا" tone="pending" />}
          </Pressable>
        ))}
      </GlassCard>
      <Pressable accessibilityRole="link" onPress={() => router.push('/usul')}>
        <GlassCard style={[styles.row, { gap: 12 }]}>
          <View style={{ flex: 1 }}>
            <Display size={17}>أصول الفقه</Display>
            <Caption>قاعدة واحدة · مثال من التصميم</Caption>
          </View>
          <Icon name="chevronLeft" size={18} color={colors.ink} />
        </GlassCard>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  item: { gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.hairline },
});
