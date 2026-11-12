import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { PageHeader } from '@/components/PageHeader';
import { Screen } from '@/components/Screen';
import { Squircle } from '@/components/Squircle';
import { Body, Caption, Display } from '@/components/Typography';
import { Chip, GlassCard, InnerCard, ReviewNotice, Segmented, Stepper } from '@/components/ui';
import { CALCULATORS_REVIEWED } from '@/config';
import { ar } from '@/content/quran';
import { inheritanceScreen as I } from '@/content/worship';
import { F } from '@/theme/fonts';
import { colors } from '@/theme/tokens';

type HeirKey = (typeof I.heirs)[number]['key'];
type Madhhab = (typeof I.madhhabs)[number][0];

const eur = (x: number) => `${ar(Math.round(x).toLocaleString('en-US').replace(/,/g, '٬'))} €`;

/**
 * Inheritance — as on the canvas, ONLY the worked example (زوجة + ابن + بنت) is
 * computed. The general engine stays off until scholar-validated test cases
 * pass (plan §4.6); any other combination shows the canvas's notice.
 */
export default function InheritanceScreen() {
  const [madhhab, setMadhhab] = useState<Madhhab>(I.defaultMadhhab as Madhhab);
  const [estate, setEstate] = useState(I.defaultEstate);
  const [c, setC] = useState<Record<HeirKey, number>>({ ...I.example.counts });
  const est = parseFloat(estate) || 0;
  const isExample = (Object.keys(I.example.counts) as HeirKey[]).every((k) => c[k] === I.example.counts[k]);

  return (
    <Screen backdrop="meadow" withTabBar={false} header={<PageHeader title={I.title} />}>
      {!CALCULATORS_REVIEWED.inheritance ? <ReviewNotice /> : null}
      <Squircle radius={24} gradient={['#E8CF9A', '#F3E2B9']} style={{ padding: 16, gap: 4 }}>
        <Body size={14} weight="bold" color={colors.pendingInk}>
          {I.beta}
        </Body>
        <Body size={13} color={colors.pendingInk}>
          {I.betaBody}
        </Body>
      </Squircle>

      <GlassCard style={{ gap: 14 }}>
        <Display size={21.5}>{I.caseTitle}</Display>
        <Body size={14} weight="medium">
          {I.madhhabTitle}
        </Body>
        <Segmented options={I.madhhabs.map(([value, label]) => ({ value, label }))} value={madhhab} onChange={setMadhhab} />
        <InnerCard style={{ gap: 6 }}>
          <Caption>{I.estateLabel}</Caption>
          <TextInput value={estate} onChangeText={setEstate} inputMode="decimal" accessibilityLabel={I.estateLabel} style={[styles.input, { fontFamily: F.display }]} />
        </InnerCard>
      </GlassCard>

      <GlassCard style={{ gap: 12 }}>
        <Display size={21.5}>{I.heirsTitle}</Display>
        <View style={styles.grid}>
          {I.heirs.map((h) => (
            <InnerCard key={h.key} selected={c[h.key] > 0} style={styles.heir}>
              <View>
                <Display size={16}>{h.label}</Display>
                {h.hint ? <Caption>{h.hint}</Caption> : null}
              </View>
              <Stepper
                label={h.label}
                value={ar(c[h.key])}
                onInc={() => setC((o) => ({ ...o, [h.key]: Math.min(h.max, o[h.key] + 1) }))}
                onDec={() => setC((o) => ({ ...o, [h.key]: Math.max(0, o[h.key] - 1) }))}
              />
            </InnerCard>
          ))}
        </View>
      </GlassCard>

      <GlassCard tint="mint" style={{ gap: 12 }}>
        <View>
          <Display size={21.5}>{I.example.title}</Display>
          <Caption>{I.example.sub}</Caption>
        </View>
        {I.example.rows.map((r) => (
          <InnerCard key={r.heir} style={[styles.row, { gap: 10 }]}>
            <View style={{ flex: 1 }}>
              <Display size={16}>{r.heir}</Display>
              <Caption>{r.basis}</Caption>
            </View>
            <Display size={18} color={colors.primary}>
              {r.share}
            </Display>
            <Body size={14} weight="bold" style={{ minWidth: 92, textAlign: 'left' }}>
              {eur(est * r.fraction)}
            </Body>
          </InnerCard>
        ))}
        <Body size={14} color="#4A4B57" lineHeight={24}>
          {I.example.explain}
        </Body>
        <Body size={13} weight="medium" color={colors.primary}>
          {I.example.evidence}
        </Body>
        <Chip label={isExample ? I.example.match : I.example.notEnabled} tone={isExample ? 'reviewed' : 'pending'} />
      </GlassCard>

      <Body size={12} weight="medium" color="#7A5C24" style={{ paddingHorizontal: 6 }}>
        {I.disclaimer}
      </Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  heir: { width: '48.5%', gap: 10, paddingVertical: 12, paddingHorizontal: 12 },
  input: { fontSize: 22, color: colors.ink, paddingVertical: 0, textAlign: 'right' },
});
