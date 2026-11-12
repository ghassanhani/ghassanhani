import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Breadcrumbs } from '@/components/blocks';
import { Icon } from '@/components/Icon';
import { PageHeader } from '@/components/PageHeader';
import { Screen } from '@/components/Screen';
import { Squircle } from '@/components/Squircle';
import { Body, Caption, Display } from '@/components/Typography';
import { CountBadge, GlassCard, HeroCard, IconBubble, ReviewedChip } from '@/components/ui';
import { usul as U } from '@/content/modules';
import { ar } from '@/content/quran';
import { colors, space } from '@/theme/tokens';

export default function UsulScreen() {
  return (
    <Screen backdrop="sea" withTabBar={false} header={<PageHeader title={U.title} fallback="/library" />}>
      <Breadcrumbs items={U.crumbs} />

      <HeroCard hero="teal" style={{ gap: 4 }}>
        <Body size={13} weight="medium" color={colors.gold}>
          {U.hero.label}
        </Body>
        <Display size={32} color={colors.white} lineHeight={46}>
          {U.hero.title}
        </Display>
        <Caption color="rgba(255,255,255,0.8)">{U.hero.sub}</Caption>
      </HeroCard>

      <GlassCard style={{ gap: 12 }}>
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <Display size={21.5}>{U.definition.title}</Display>
          <ReviewedChip />
        </View>
        <View style={styles.quote}>
          <Display size={19} lineHeight={34}>
            {U.definition.quote}
          </Display>
        </View>
        <Caption>{U.definition.source}</Caption>
        <Body size={14} weight="bold" color={colors.primary}>
          {U.definition.briefTitle}
        </Body>
        <Body size={14} color="#4A4B57" lineHeight={26}>
          {U.definition.brief}
        </Body>
      </GlassCard>

      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <Display size={21.5}>{U.appliedTitle}</Display>
        <Caption>{U.appliedMore}</Caption>
      </View>
      <View style={[styles.row, { gap: 12, alignItems: 'stretch' }]}>
        {U.applied.map((a) => (
          <Pressable key={a.title} accessibilityRole="link" style={{ flex: 1 }} onPress={() => router.push(a.route as never)}>
            <GlassCard style={{ padding: 16, gap: 6, flex: 1 }}>
              <CountBadge value={a.tag} />
              <Display size={16} lineHeight={24}>
                {a.title}
              </Display>
              <Body size={12} color={colors.primary}>
                {a.meta}
              </Body>
            </GlassCard>
          </Pressable>
        ))}
      </View>

      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <Display size={21.5}>{U.maximsTitle}</Display>
        <Caption>{U.maximsSource}</Caption>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rail} contentContainerStyle={styles.railContent}>
        {U.maxims.map((m, i) => (
          <GlassCard key={m} style={styles.maxim}>
            <CountBadge value={ar(i + 1)} />
            <Display size={16} lineHeight={24} style={{ marginTop: 'auto' }}>
              {m}
            </Display>
          </GlassCard>
        ))}
      </ScrollView>

      <GlassCard style={{ gap: 14 }}>
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <Display size={21.5}>{U.maqasid.title}</Display>
          <Caption>{U.maqasid.sub}</Caption>
        </View>
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          {U.maqasid.items.map((m) => (
            <View key={m.name} style={{ alignItems: 'center', gap: 6 }}>
              <Squircle radius={26} fill={m.color} glow="button" style={styles.maqsad}>
                <Display size={15} color={colors.white}>
                  {m.name}
                </Display>
              </Squircle>
              <Caption>{U.maqasid.verb}</Caption>
            </View>
          ))}
        </View>
        <Caption>{U.maqasid.source}</Caption>
      </GlassCard>

      <Pressable accessibilityRole="link" onPress={() => router.push('/path')}>
        <GlassCard soft style={[styles.row, { gap: 12, paddingVertical: 16 }]}>
          <IconBubble name="books" size={36} iconSize={18} color={colors.sky} />
          <View style={{ flex: 1 }}>
            <Caption>{U.path.label}</Caption>
            <Display size={16}>{U.path.title}</Display>
          </View>
          <Icon name="chevronLeft" size={20} color={colors.ink} />
        </GlassCard>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  quote: { borderStartWidth: 3, borderStartColor: colors.primary, paddingStart: 14 },
  rail: { marginHorizontal: -space.gutter, flexGrow: 0 },
  railContent: { paddingHorizontal: space.gutter, gap: 9 },
  maxim: { width: 130, height: 120, padding: 14 },
  maqsad: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
});
