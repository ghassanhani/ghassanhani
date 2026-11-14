import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Pressable } from '@/components/Tap';
import { LinkRow, StatTiles } from '@/components/blocks';
import { PageHeader } from '@/components/PageHeader';
import { Screen } from '@/components/Screen';
import { Squircle } from '@/components/Squircle';
import { Body, Caption, Display } from '@/components/Typography';
import { Chip, GlassCard, IconBubble, InnerCard, SampleBanner } from '@/components/ui';
import { narrator as N } from '@/content/modules';
import { colors } from '@/theme/tokens';

export default function NarratorScreen() {
  return (
    <Screen backdrop="sea" withTabBar={false} header={<PageHeader title={N.title} fallback="/hadith/bukhari:8" />}>
      <SampleBanner />
      <GlassCard style={{ alignItems: 'center', gap: 8 }}>
        <Squircle radius={36} fill={colors.primary} glow="button" style={styles.avatar}>
          <Display size={30} color={colors.white}>
            {N.initial}
          </Display>
        </Squircle>
        <Display size={24} style={{ textAlign: 'center' }}>
          {N.name}
        </Display>
        <Body size={13} color={colors.primary}>
          {N.sub}
        </Body>
        <View style={[styles.row, { gap: 6, flexWrap: 'wrap', justifyContent: 'center' }]}>
          {N.chips.map((c) => (
            <Chip key={c.label} label={c.label} tone={c.tone} badge={'badge' in c && c.badge} />
          ))}
        </View>
        <View style={{ alignSelf: 'stretch', marginTop: 6 }}>
          <StatTiles items={N.stats} />
        </View>
      </GlassCard>

      <GlassCard style={{ gap: 10 }}>
        <Display size={21.5}>{N.jarh.title}</Display>
        <View style={[styles.row, { gap: 10 }]}>
          <IconBubble name="badge" size={34} iconSize={18} color={colors.primary} />
          <Body size={14} color="#4A4B57" style={{ flex: 1 }} lineHeight={24}>
            {N.jarh.body}
          </Body>
        </View>
      </GlassCard>

      <GlassCard style={{ gap: 10, alignItems: 'center' }}>
        <Display size={21.5} style={{ alignSelf: 'flex-start' }}>
          {N.network.title}
        </Display>
        <Caption>{N.network.fromLabel}</Caption>
        <View style={[styles.row, { gap: 10 }]}>
          {N.network.teachers.map((t) => (
            <Person key={t.name} name={t.name} sub={t.sub} />
          ))}
        </View>
        <View style={styles.stem} />
        <Squircle radius={22} fill={colors.primary} glow="button" style={styles.self}>
          <Display size={16} color={colors.white}>
            {N.network.self}
          </Display>
        </Squircle>
        <View style={styles.stem} />
        <View style={[styles.row, { gap: 10 }]}>
          {N.network.students.map((t) => (
            <Person key={t.name} name={t.name} sub={t.sub} />
          ))}
        </View>
        <Caption>{N.network.toLabel}</Caption>
      </GlassCard>

      <GlassCard style={{ gap: 10 }}>
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <Display size={21.5}>{N.narrations.title}</Display>
          <Pressable accessibilityRole="link" onPress={() => router.push('/search')}>
            <Body size={13} weight="medium" color={colors.primary}>
              {N.narrations.all}
            </Body>
          </Pressable>
        </View>
        {N.narrations.items.map((n) => (
          <LinkRow key={n.text} route={n.route}>
            <Display size={17} lineHeight={30}>
              {n.text}
            </Display>
            <View style={[styles.row, { gap: 8 }]}>
              {n.chip ? <Chip label={`${n.chip} · بانتظار المراجعة`} tone="pending" /> : null}
              <Caption>{n.ref}</Caption>
            </View>
          </LinkRow>
        ))}
      </GlassCard>

      <Squircle radius={30} fill="rgba(247,241,241,0.61)" stroke="#FFFFFF" style={{ padding: 16, gap: 2 }}>
        <Body size={13} weight="bold" color={colors.primary}>
          {N.sources.title}
        </Body>
        <Caption>{N.sources.body}</Caption>
      </Squircle>
    </Screen>
  );
}

function Person({ name, sub }: { name: string; sub: string }) {
  return (
    <InnerCard style={{ minWidth: 110, alignItems: 'center', paddingVertical: 10 }}>
      <Display size={15}>{name}</Display>
      {sub ? <Caption>{sub}</Caption> : null}
    </InnerCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  stem: { width: 2, height: 14, backgroundColor: 'rgba(3,90,95,0.25)' },
  self: { height: 44, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center' },
});
