import { router } from 'expo-router';
import { Fragment, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { PageHeader } from '@/components/PageHeader';
import { Screen } from '@/components/Screen';
import { AyahText, Body, Caption, Display } from '@/components/Typography';
import { CountBadge, GlassCard, InnerCard, Segmented, Stepper, Switch } from '@/components/ui';
import { settings as S } from '@/content/account';
import { ar } from '@/content/quran';
import { credits } from '@/content/sources';
import { colors } from '@/theme/tokens';

/** Settings — choices are held in memory for now (persistence comes with the storage layer). */
export default function SettingsScreen() {
  const [size, setSize] = useState(24);
  const [tashkeel, setTashkeel] = useState(false);
  const [theme, setTheme] = useState<string>('auto');
  const [notifs, setNotifs] = useState(S.notifications.items.map((n) => n.on));
  const [suggested, setSuggested] = useState(true);
  const [analytics, setAnalytics] = useState(false);

  return (
    <Screen backdrop="sand" withTabBar={false} header={<PageHeader title={S.title} fallback="/me" />}>
      <Display size={21.5}>{S.reading.title}</Display>
      <GlassCard style={{ gap: 12 }}>
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <View style={[styles.row, { gap: 8 }]}>
            <Display size={16}>{S.reading.size}</Display>
            <CountBadge value={ar(size)} />
          </View>
          <View style={{ width: 140 }}>
            <Stepper label={S.reading.size} value="" onDec={() => setSize((s) => Math.max(16, s - 2))} onInc={() => setSize((s) => Math.min(40, s + 2))} />
          </View>
        </View>
        <InnerCard style={{ alignItems: 'center' }}>
          <AyahText size={size} lineHeight={size * 1.9}>
            {S.reading.preview}
          </AyahText>
        </InnerCard>
        <ToggleRow title={S.reading.tashkeel.title} sub={S.reading.tashkeel.sub} value={tashkeel} onChange={setTashkeel} />
        <Display size={16}>{S.reading.theme.title}</Display>
        <Segmented options={S.reading.theme.options.map(([value, label]) => ({ value, label }))} value={theme} onChange={setTheme} />
      </GlassCard>

      <Display size={21.5}>{S.prayer.title}</Display>
      <GlassCard style={{ paddingVertical: 8 }}>
        <LinkItem first title={S.prayer.method.title} sub={S.prayer.method.sub} route="/prayer" />
        <LinkItem title={S.prayer.asr.title} sub={S.prayer.asr.sub} route="/prayer" />
        <LinkItem title={S.prayer.location.title} sub={S.prayer.location.sub} />
      </GlassCard>

      <Display size={21.5}>{S.notifications.title}</Display>
      <GlassCard style={{ paddingVertical: 8 }}>
        {S.notifications.items.map((n, i) => (
          <Fragment key={n.title}>
            {i ? <View style={styles.sep} /> : null}
            <ToggleRow title={n.title} sub={n.sub} value={notifs[i]} onChange={(v) => setNotifs((a) => a.map((x, j) => (j === i ? v : x)))} />
          </Fragment>
        ))}
      </GlassCard>

      <Display size={21.5}>{S.content.title}</Display>
      <GlassCard style={{ paddingVertical: 8 }}>
        <LinkItem first title={S.content.madhhab.title} sub={S.content.madhhab.sub} route="/onboarding" />
        <LinkItem title={S.content.lang.title} sub={S.content.lang.sub} route="/onboarding" />
        <View style={styles.sep} />
        <ToggleRow title={S.content.suggested.title} sub={S.content.suggested.sub} value={suggested} onChange={setSuggested} />
      </GlassCard>

      <Display size={21.5}>{S.privacy.title}</Display>
      <GlassCard style={{ gap: 6 }}>
        {S.privacy.lines.map((l) => (
          <View key={l} style={[styles.row, { gap: 8 }]}>
            <Icon name="badge" size={16} color={colors.primary} />
            <Body size={14}>{l}</Body>
          </View>
        ))}
        <View style={styles.sep} />
        <ToggleRow title={S.privacy.analytics.title} sub={S.privacy.analytics.sub} value={analytics} onChange={setAnalytics} />
      </GlassCard>

      <Display size={21.5}>{S.trust.title}</Display>
      <GlassCard style={{ paddingVertical: 8 }}>
        <LinkItem first title={S.trust.method.title} sub={S.trust.method.sub} />
        <LinkItem title={S.trust.report.title} sub={S.trust.report.sub} />
        <View style={[styles.sep, { marginBottom: 8 }]} />
        <Display size={16} style={{ marginBottom: 4 }}>
          {S.trust.creditsTitle}
        </Display>
        {credits().map((c) => (
          <View key={c.name} style={[styles.row, { justifyContent: 'space-between', gap: 10, paddingVertical: 6 }]}>
            <Body size={13} style={{ flex: 1 }}>
              {c.name}
            </Body>
            <Caption>{c.terms}</Caption>
          </View>
        ))}
      </GlassCard>

      <Body size={12} weight="medium" color="#7A5C24" style={{ paddingHorizontal: 6 }}>
        {S.disclaimer}
      </Body>
      <Caption style={{ textAlign: 'center' }}>{S.version}</Caption>
    </Screen>
  );
}

function ToggleRow({ title, sub, value, onChange }: { title: string; sub: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={[styles.row, { gap: 12, minHeight: 60, paddingVertical: 8 }]}>
      <View style={{ flex: 1 }}>
        <Display size={16}>{title}</Display>
        <Caption>{sub}</Caption>
      </View>
      <Switch label={title} value={value} onChange={onChange} />
    </View>
  );
}

function LinkItem({ title, sub, route, first }: { title: string; sub: string; route?: string; first?: boolean }) {
  return (
    <Fragment>
      {!first ? <View style={styles.sep} /> : null}
      <Pressable accessibilityRole="button" disabled={!route} onPress={() => route && router.push(route as never)} style={[styles.row, { gap: 12, paddingVertical: 12 }]}>
        <View style={{ flex: 1 }}>
          <Display size={16}>{title}</Display>
          <Body size={13} color={colors.primary}>
            {sub}
          </Body>
        </View>
        {route ? <Icon name="chevronLeft" size={20} color={colors.ink} /> : null}
      </Pressable>
    </Fragment>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  sep: { height: 1, backgroundColor: colors.hairline },
});
