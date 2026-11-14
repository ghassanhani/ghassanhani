import { router } from 'expo-router';
import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';
import { Pressable } from '@/components/Tap';
import { HeroLink, StatTiles } from '@/components/blocks';
import { Icon, type IconName } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Squircle } from '@/components/Squircle';
import { Body, Caption, Display } from '@/components/Typography';
import { GlassCard, IconBubble, RoundButton } from '@/components/ui';
import { me as M } from '@/content/account';
import { ar } from '@/content/quran';
import { usePrefs } from '@/store/prefs';
import { colors } from '@/theme/tokens';

// Worship tools stay one tap away (they have no tab of their own).
const tools: { title: string; icon: IconName; route: string }[] = [
  // one family (Hugeicons line icons), one weight, one colour
  { title: 'مواقيت الصلاة والقبلة', icon: 'mosque', route: '/prayer' },
  { title: 'الأذكار', icon: 'tasbih', route: '/adhkar' },
  { title: 'حاسبة الزكاة', icon: 'zakat', route: '/zakat' },
  { title: 'حاسبة المواريث', icon: 'scale', route: '/inheritance' },
];

export default function MeScreen() {
  const [prefs] = usePrefs();
  return (
    <Screen backdrop="sand">
      <View style={[styles.row, { gap: 14, marginTop: 8 }]}>
        <Squircle radius={32} fill={colors.primary} glow="button" style={styles.avatar}>
          <Display size={26} color={colors.goldWarm}>
            {M.initial}
          </Display>
        </Squircle>
        <View style={{ flex: 1 }}>
          <Body size={15} color={colors.muted}>
            {M.greeting}
          </Body>
          <Display size={26}>{M.name}</Display>
        </View>
        <RoundButton icon="list" label="الإعدادات" onPress={() => router.push('/settings')} />
      </View>

      <GlassCard style={{ gap: 8 }}>
        <View style={[styles.row, { gap: 8 }]}>
          <Display size={17} style={{ flex: 1 }}>
            {M.sync.title}
          </Display>
          <Caption>{M.sync.tag}</Caption>
          <Squircle radius={18} fill={colors.white} style={styles.small}>
            <Body size={13} weight="bold" color={colors.primary}>
              {M.sync.cta}
            </Body>
          </Squircle>
        </View>
        <Caption>{M.sync.body}</Caption>
      </GlassCard>

      <StatTiles items={M.stats} />

      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <Display size={21.5}>{M.collectionsTitle}</Display>
        <Body size={13} weight="medium" color={colors.primary}>
          {`+ ${M.newCollection}`}
        </Body>
      </View>
      <View style={[styles.row, { gap: 12 }]}>
        {M.collections.map((c) => (
          <GlassCard key={c.title} style={{ flex: 1, padding: 16, gap: 4, minHeight: 110 }}>
            <IconBubble name="bookmark" size={31} iconSize={16} color={colors.ink} />
            <Display size={16} style={{ marginTop: 'auto' }}>
              {c.title}
            </Display>
            <Caption>{c.meta}</Caption>
          </GlassCard>
        ))}
      </View>

      <GlassCard style={{ paddingVertical: 8 }}>
        {M.study.map((s, i) => (
          <Row key={s.title} first={i === 0} title={s.title} meta={s.route === '/path' ? `أركان الإسلام · أنجزت ${ar(prefs.pathDone.length)} من ١٢` : s.meta} onPress={() => router.push(s.route as never)} />
        ))}
      </GlassCard>

      <GlassCard style={{ paddingVertical: 8 }}>
        {tools.map((t, i) => (
          <Row key={t.route} first={i === 0} title={t.title} icon={t.icon} onPress={() => router.push(t.route as never)} />
        ))}
      </GlassCard>

      <HeroLink label={M.plus.label} title={M.plus.title} sub={M.plus.sub} route="/plus" />

      <GlassCard style={{ paddingVertical: 8 }}>
        {M.more.map((m, i) => (
          <Row key={m.title} first={i === 0} title={m.title} onPress={m.route ? () => router.push(m.route as never) : undefined} />
        ))}
        <Row first={false} title="الإعداد الأول" onPress={() => router.push('/onboarding')} />
      </GlassCard>
    </Screen>
  );
}

function Row({ title, meta, icon, first, onPress }: { title: string; meta?: string; icon?: IconName; first: boolean; onPress?: () => void }) {
  return (
    <Fragment>
      {!first ? <View style={styles.sep} /> : null}
      <Pressable accessibilityRole="button" onPress={onPress} disabled={!onPress} style={[styles.row, { gap: 12, paddingVertical: 12 }]}>
        {icon ? <IconBubble name={icon} size={36} iconSize={18} color={colors.primary} /> : null}
        <View style={{ flex: 1 }}>
          <Display size={16}>{title}</Display>
          {meta ? (
            <Body size={13} color={colors.primary}>
              {meta}
            </Body>
          ) : null}
        </View>
        {onPress ? <Icon name="chevronLeft" size={20} color={colors.ink} /> : null}
      </Pressable>
    </Fragment>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  small: { height: 34, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  sep: { height: 1, backgroundColor: colors.hairline },
});
