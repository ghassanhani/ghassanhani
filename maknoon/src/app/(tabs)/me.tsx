import { router } from 'expo-router';
import { Fragment } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Body, Caption, Display } from '@/components/Typography';
import { GlassCard, IconBubble } from '@/components/ui';
import { colors } from '@/theme/tokens';

// «أنا»: the full Me / Settings / Plus artboards come in a later batch; until then this
// tab gathers the worship tools so every built screen is reachable.
const tools: { title: string; icon: IconName; route: string }[] = [
  { title: 'مواقيت الصلاة والقبلة', icon: 'compass', route: '/prayer' },
  { title: 'الأذكار', icon: 'moonCloud', route: '/adhkar' },
  { title: 'برنامج الحفظ', icon: 'mic', route: '/hifz' },
  { title: 'فهرس السور', icon: 'list', route: '/surahs' },
  { title: 'حاسبة الزكاة', icon: 'books', route: '/zakat' },
  { title: 'حاسبة المواريث', icon: 'books', route: '/inheritance' },
];

export default function MeScreen() {
  return (
    <Screen backdrop="sand">
      <Display size={30} lineHeight={44} style={{ marginTop: 8 }}>
        أنا
      </Display>
      <GlassCard style={{ paddingVertical: 8 }}>
        {tools.map((t, i) => (
          <Fragment key={t.route}>
            {i ? <View style={styles.sep} /> : null}
            <Pressable accessibilityRole="button" onPress={() => router.push(t.route as never)} style={styles.row}>
              <IconBubble name={t.icon} size={36} iconSize={18} color={colors.primary} />
              <Body size={16} weight="medium" style={{ flex: 1 }}>
                {t.title}
              </Body>
              <Icon name="chevronLeft" size={20} color={colors.ink} />
            </Pressable>
          </Fragment>
        ))}
      </GlassCard>
      <Caption style={{ paddingHorizontal: 6 }}>الملاحظات والإعدادات والمكنون بلس — في دفعة لاحقة من الشاشات.</Caption>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  sep: { height: 1, backgroundColor: colors.hairline },
});
