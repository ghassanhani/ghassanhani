import { Fragment } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { DetailHeader } from '@/components/DetailHeader';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Squircle } from '@/components/Squircle';
import { Body, Caption, Display } from '@/components/Typography';
import { Chip, CountBadge, GlassCard, InnerCard } from '@/components/ui';
import { hadith as h } from '@/content/design';
import { colors } from '@/theme/tokens';

/**
 * Hadith detail: matn, attributed gradings (grader → verdict → reference),
 * isnad chain, shuruh and parallel narrations. Content = design sample (see content/design.ts).
 */
export default function HadithScreen() {
  return (
    <Screen backdrop="sand" withTabBar={false} header={<DetailHeader title={h.title} />}>
      <GlassCard style={{ gap: 6 }}>
        <Caption>{h.chapter}</Caption>
        <Body size={14} color={colors.primary}>
          {h.narrator}
        </Body>
        <Display size={22} lineHeight={44} selectable>
          {h.matn}
        </Display>
        <Pressable accessibilityRole="button" style={{ alignSelf: 'center', marginTop: 8 }}>
          <Squircle radius={18} fill={colors.white} style={styles.evidence}>
            <Body size={13} weight="bold" color={colors.primary} lineHeight={20}>
              {h.evidence}
            </Body>
          </Squircle>
        </Pressable>
      </GlassCard>

      <GlassCard style={{ gap: 10 }}>
        <Display size={22}>{h.gradingsTitle}</Display>
        {h.gradings.map((g, i) => (
          <InnerCard key={i} style={{ gap: 4 }}>
            <View style={[styles.row, { gap: 8 }]}>
              <Display size={15}>{g.grader}</Display>
              <Chip label={g.verdict} tone={g.tone} />
            </View>
            <Body size={14} color={colors.primary}>
              {g.ref}
            </Body>
          </InnerCard>
        ))}
      </GlassCard>

      <GlassCard style={{ gap: 10 }}>
        <Display size={22}>{h.isnadTitle}</Display>
        <InnerCard style={{ paddingVertical: 18 }}>
          {h.isnad.map((n, i) => (
            <Fragment key={n.name}>
              <View style={[styles.between, { alignItems: 'center' }]}>
                <View style={[styles.row, { gap: 12 }]}>
                  <IsnadDot kind={n.kind} />
                  <Display size={n.kind === 'prophet' ? 19 : 15} color={n.kind === 'author' ? colors.primary : colors.ink}>
                    {n.name}
                  </Display>
                </View>
                {n.role ? (
                  <Body size={12} color={n.kind === 'companion' ? '#5DAA55' : n.kind === 'author' ? colors.primary : colors.muted}>
                    {n.role}
                  </Body>
                ) : null}
              </View>
              {i < h.isnad.length - 1 ? <View style={styles.link} /> : null}
            </Fragment>
          ))}
        </InnerCard>
      </GlassCard>

      <GlassCard style={{ gap: 10 }}>
        <Display size={22}>{h.shuruhTitle}</Display>
        {h.shuruh.map((s) => (
          <InnerCard key={s.title} style={{ gap: 4 }}>
            <View style={[styles.row, { gap: 8 }]}>
              {'count' in s ? <CountBadge value={s.count} /> : null}
              <Display size={15}>{s.title}</Display>
              {'chip' in s ? <Chip label={s.chip} tone={s.tone} /> : null}
            </View>
            <Body size={14} color={colors.primary}>
              {s.meta}
            </Body>
          </InnerCard>
        ))}
      </GlassCard>
    </Screen>
  );
}

function IsnadDot({ kind }: { kind: 'prophet' | 'companion' | 'narrator' | 'author' }) {
  if (kind === 'prophet') {
    return (
      <View style={[styles.dot, { borderColor: '#E3C58C', backgroundColor: '#FFF8EA', width: 22, height: 22, borderRadius: 11 }]}>
        <Icon name="badge" size={13} color="#B8975A" />
      </View>
    );
  }
  if (kind === 'author') return <View style={[styles.dot, { backgroundColor: colors.primary, borderColor: colors.primary }]} />;
  return <View style={[styles.dot, { borderColor: kind === 'companion' ? '#84C57D' : '#7DBAC5' }]} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', justifyContent: 'space-between' },
  evidence: { height: 36, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 4, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  link: { width: 2, height: 22, backgroundColor: '#EAEAEA', marginStart: 10, marginVertical: 2 },
});
