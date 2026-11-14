import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Breadcrumbs, HeroLink, LinkRow, StatTiles } from '@/components/blocks';
import { PageHeader } from '@/components/PageHeader';
import { Screen } from '@/components/Screen';
import { Squircle } from '@/components/Squircle';
import { AyahText, Body, Caption, Display } from '@/components/Typography';
import { Chip, CountBadge, GlassCard, InnerCard, PendingChip, RoundButton, Switch, SampleBanner } from '@/components/ui';
import { fiqh as Q } from '@/content/modules';
import { ar } from '@/content/quran';
import { colors } from '@/theme/tokens';
import { MADHHAB_NAMES, usePrefs } from '@/store/prefs';

const MADHHAB_ID = { hanafi: 'h', maliki: 'm', shafii: 's', hanbali: 'b' } as const;

/** Fiqh issue: madhhab positions (attributed), evidence, cause of disagreement. Information, not a fatwa. */
export default function FiqhScreen() {
  const [prefs] = usePrefs();
  // The user's madhhab (from onboarding/settings); «عرض الكل» → none highlighted.
  const mine = prefs.madhhab === 'all' ? null : MADHHAB_ID[prefs.madhhab];
  const [mineFirst, setMineFirst] = useState(true);
  const list = mineFirst ? [...Q.madhhabs.filter((m) => m.id === mine), ...Q.madhhabs.filter((m) => m.id !== mine)] : Q.madhhabs;

  return (
    <Screen backdrop="sea" withTabBar={false} header={<PageHeader title={Q.title} fallback="/fiqh-index" action={<RoundButton icon="share" label="مشاركة" size={40} iconSize={18} />} />}>
      <SampleBanner />
      <Breadcrumbs items={Q.crumbs} />

      <GlassCard style={{ gap: 12 }}>
        <View style={[styles.row, { gap: 8 }]}>
          <Chip label={Q.disputed} tone="pending" />
          <Caption>{Q.section}</Caption>
        </View>
        <Display size={26} lineHeight={38}>
          {Q.issue}
        </Display>
        <StatTiles items={Q.stats} />
      </GlassCard>

      {mine && prefs.madhhab !== 'all' ? (
        <GlassCard soft style={[styles.row, { gap: 12, paddingVertical: 16 }]}>
          <View style={{ flex: 1 }}>
            <Display size={17}>{Q.mineToggle.title}</Display>
            <Caption>{`مذهبك: ${MADHHAB_NAMES[prefs.madhhab]} · تبقى المذاهب كلها ظاهرة`}</Caption>
          </View>
          <Switch label={Q.mineToggle.title} value={mineFirst} onChange={setMineFirst} />
        </GlassCard>
      ) : null}

      {list.map((m) => {
        const isMine = mineFirst && m.id === mine;
        return (
          <Squircle key={m.id} radius={28} fill="rgba(255,255,255,0.75)" glow="glass" stroke={isMine ? colors.primary : undefined} strokeWidth={2} style={{ padding: 16, gap: 8 }}>
            <View style={[styles.row, { gap: 8 }]}>
              <Display size={18}>{m.name}</Display>
              {isMine ? <CountBadge value={Q.mineToggle.mineChip} /> : null}
            </View>
            <Body size={16} lineHeight={28}>
              {m.pos}
            </Body>
            <View style={[styles.row, { justifyContent: 'space-between' }]}>
              <Caption>{`${m.ref}${Q.refSuffix}`}</Caption>
              <PendingChip />
            </View>
          </Squircle>
        );
      })}

      <GlassCard style={{ gap: 12 }}>
        <View style={[styles.row, { gap: 8 }]}>
          <Display size={21.5}>{Q.evidenceTitle}</Display>
          <CountBadge value={ar(Q.evidence.length)} />
        </View>
        {Q.evidence.map((e) => (
          <LinkRow key={e.label} route={e.route}>
            <Body size={13} weight="medium" color={colors.primary}>
              {e.label}
            </Body>
            {e.kind === 'quran' ? (
              <AyahText size={22} lineHeight={42}>
                {e.text}
              </AyahText>
            ) : (
              <Body size={16} weight="bold">
                {e.text}
              </Body>
            )}
            {'chip' in e && e.chip ? <Chip label={`${e.chip} · بانتظار المراجعة`} tone="pending" /> : null}
            <Caption>{e.note}</Caption>
          </LinkRow>
        ))}
      </GlassCard>

      <GlassCard style={{ gap: 12, alignItems: 'stretch' }}>
        <Display size={21.5}>{Q.cause.title}</Display>
        <Body size={14} color="#4A4B57" style={{ textAlign: 'center' }}>
          {Q.cause.intro}
        </Body>
        <AyahText size={26} lineHeight={46} style={{ textAlign: 'center' }}>
          {Q.cause.word}
        </AyahText>
        <View style={[styles.row, { gap: 10, alignItems: 'flex-start' }]}>
          {Q.cause.branches.map((b) => (
            <View key={b.tag} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
              <Squircle radius={18} fill={b.color} glow="button" style={styles.branchTag}>
                <Display size={15} color={colors.white}>
                  {b.tag}
                </Display>
              </Squircle>
              <Caption style={{ textAlign: 'center' }}>{b.meaning}</Caption>
              <InnerCard style={{ alignSelf: 'stretch', paddingVertical: 10, alignItems: 'center' }}>
                <Body size={13} weight="bold" style={{ textAlign: 'center' }}>
                  {b.result}
                </Body>
              </InnerCard>
            </View>
          ))}
        </View>
        <Caption>{Q.cause.source}</Caption>
      </GlassCard>

      <HeroLink label={Q.usul.label} title={Q.usul.title} sub={Q.usul.sub} route="/usul" />

      <Body size={12} weight="medium" color="#7A5C24" style={{ paddingHorizontal: 6 }}>
        {Q.disclaimer}
      </Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  branchTag: { height: 36, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
});
