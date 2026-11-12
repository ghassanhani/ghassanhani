import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { PageHeader } from '@/components/PageHeader';
import { Screen } from '@/components/Screen';
import { Squircle } from '@/components/Squircle';
import { Body, Caption, Display } from '@/components/Typography';
import { Cta, GlassCard, HeroCard, ProgressBar, Segmented } from '@/components/ui';
import { plus as P } from '@/content/account';
import { DISTRIBUTION } from '@/content/ratq';
import { colors } from '@/theme/tokens';

/**
 * المكنون بلس. The canvas designs a paid subscription, but Maknoon ships free
 * (DISTRIBUTION = 'free') because several licensed sources are NonCommercial.
 * So the subscription block only renders in a 'commercial' build; the free app
 * shows the always-free promise and the sadaqah-jariyah pack sponsorship.
 */
export default function PlusScreen() {
  const paid = DISTRIBUTION === 'commercial';
  const [period, setPeriod] = useState<'month' | 'year'>('year');

  return (
    <Screen backdrop="lavender" withTabBar={false} header={<PageHeader title="" fallback="/me" />}>
      <HeroCard hero="night" style={{ gap: 12, paddingVertical: 24 }}>
        <Body size={15.5} weight="medium" color={colors.gold}>
          {P.hero.label}
        </Body>
        <Display size={45} color={colors.white} lineHeight={52}>
          {P.hero.title}
        </Display>
        <Display size={20} color={colors.white} lineHeight={28}>
          {P.hero.tagline}
        </Display>
        <Body size={14} color="#C9CBE6" lineHeight={24}>
          {paid ? `${P.hero.freeLine} ${P.hero.paidLine}` : P.hero.freeLine}
        </Body>
      </HeroCard>

      {paid ? (
        <>
          <GlassCard tint="lavender" style={{ gap: 4 }}>
            <Display size={21.5} style={{ marginBottom: 8 }}>
              {P.perksTitle}
            </Display>
            {P.perks.map((p, i) => (
              <View key={p.title} style={[styles.row, { gap: 12, paddingVertical: 12 }, i > 0 && styles.sep]}>
                <Squircle radius={14} gradient={['#015A5E', '#0C8B91']} style={styles.tick}>
                  <Icon name="badge" size={14} color={colors.white} />
                </Squircle>
                <View style={{ flex: 1 }}>
                  <Display size={16}>{p.title}</Display>
                  <Body size={13} color={colors.primary}>
                    {p.sub}
                  </Body>
                </View>
              </View>
            ))}
          </GlassCard>
          <GlassCard tint="neutral" style={{ gap: 14 }}>
            <Segmented
              options={[
                { value: 'month' as const, label: 'شهري' },
                { value: 'year' as const, label: 'سنوي' },
              ]}
              value={period}
              onChange={setPeriod}
            />
            <View style={[styles.row, { justifyContent: 'space-between' }]}>
              <Display size={22}>{period === 'year' ? 'بلس السنوي' : 'بلس الشهري'}</Display>
              <Display size={28} color={colors.primary}>
                [السعر]
              </Display>
            </View>
            <Caption>{period === 'year' ? 'يُجدَّد سنويًا · السعر بحسب بلدك' : 'يُجدَّد شهريًا · السعر بحسب بلدك'}</Caption>
            <Cta label="اشترك في بلس" height={56} />
          </GlassCard>
        </>
      ) : null}

      <HeroCard hero="forest" style={{ gap: 12 }}>
        <Body size={14} weight="medium" color={colors.gold}>
          {P.sponsor.label}
        </Body>
        <Display size={26} color={colors.white} lineHeight={34}>
          {P.sponsor.title}
        </Display>
        <Body size={14} color="#E8F0EE" lineHeight={24}>
          {P.sponsor.body}
        </Body>
        <View style={{ gap: 8 }}>
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <Body size={13} color={colors.white}>
              {P.sponsor.progress}
            </Body>
            <Body size={13} color="#CFE3DB">
              {P.sponsor.of}
            </Body>
          </View>
          <ProgressBar value={0} height={12} fill="#26CCDB" track="rgba(255,255,255,0.3)" />
        </View>
        <Pressable accessibilityRole="button">
          <Squircle radius={24} fill={colors.white} glow="glass" style={styles.give}>
            <Display size={14}>{P.sponsor.cta}</Display>
          </Squircle>
        </Pressable>
        <Caption color="#CFE3DB">{P.sponsor.note}</Caption>
      </HeroCard>

      <Body size={13} weight="medium" color={colors.primary} style={{ textAlign: 'center' }}>
        {P.footer}
      </Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  sep: { borderTopWidth: 1, borderTopColor: colors.hairline },
  tick: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  give: { height: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
});
