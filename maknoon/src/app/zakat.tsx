import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { PageHeader } from '@/components/PageHeader';
import { Screen } from '@/components/Screen';
import { Squircle } from '@/components/Squircle';
import { Body, Caption, Display } from '@/components/Typography';
import { Chip, GlassCard, HeroCard, InnerCard, ReviewNotice, RoundButton, Segmented, SoftButton } from '@/components/ui';
import { ar } from '@/content/quran';
import { zakatScreen as Z } from '@/content/worship';
import { CALCULATORS_REVIEWED } from '@/config';
import { zakat } from '@/worship/zakat-core';
import { F } from '@/theme/fonts';
import { colors } from '@/theme/tokens';

type Key = keyof typeof Z.sample;

const num = (s: string) => {
  const x = parseFloat(s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(',', '.'));
  return Number.isFinite(x) ? x : 0;
};
const eur = (x: number) => `${ar(Math.round(x).toLocaleString('en-US').replace(/,/g, '٬'))} €`;

/** Arithmetic only: follows the one rule the screen states (single declared opinion). Not a fatwa. */
export default function ZakatScreen() {
  const [basis, setBasis] = useState<'gold' | 'silver'>('gold');
  const [v, setV] = useState<Record<Key, string>>({ ...Z.sample });
  const set = (k: Key) => (t: string) => setV((o) => ({ ...o, [k]: t }));

  const { net, nisab, due, amount } = zakat({ cash: num(v.cash), goldG: num(v.gold), goldPrice: num(v.gp), silverG: num(v.silver), silverPrice: num(v.sp), trade: num(v.trade), owed: num(v.owed), debt: num(v.debt), basis });

  return (
    <Screen
      backdrop="meadow"
      withTabBar={false}
      header={<PageHeader title={Z.title} action={<RoundButton icon="list" label="حاسبة المواريث" size={40} iconSize={20} onPress={() => router.push('/inheritance')} />} />}
    >
      {!CALCULATORS_REVIEWED.zakat ? <ReviewNotice /> : null}
      <HeroCard hero="forest" style={{ gap: 12 }}>
        <Body size={15.5} weight="medium" color={colors.gold}>
          {Z.dueLabel}
        </Body>
        <Display size={44} color={colors.white} lineHeight={52}>
          {due ? eur(amount) : '٠ €'}
        </Display>
        {nisab > 0 && due ? (
          <Chip label={Z.due} tone="reviewed" />
        ) : (
          <View style={styles.statusOff}>
            <Body size={13} weight="medium" color={colors.white}>
              {nisab <= 0 ? Z.noPrice : Z.notDue}
            </Body>
          </View>
        )}
        <View style={[styles.row, { gap: 10 }]}>
          <Stat label={Z.net} value={eur(net)} />
          <Stat label={Z.nisab} value={nisab > 0 ? eur(nisab) : '—'} />
        </View>
      </HeroCard>

      <GlassCard tint="peach" style={{ gap: 16 }}>
        <Display size={21.5}>{Z.basisTitle}</Display>
        <Segmented
          options={[
            { value: 'gold' as const, label: Z.gold },
            { value: 'silver' as const, label: Z.silver },
          ]}
          value={basis}
          onChange={setBasis}
        />
        <View style={[styles.row, { gap: 10 }]}>
          <PriceField label={Z.goldPrice} value={v.gp} onChange={set('gp')} />
          <PriceField label={Z.silverPrice} value={v.sp} onChange={set('sp')} />
        </View>
        <Chip label={Z.sampleNote} tone="pending" />
      </GlassCard>

      <GlassCard tint="mint" style={{ gap: 14 }}>
        <Display size={21.5}>{Z.assetsTitle}</Display>
        {Z.fields.map((f) => (
          <InnerCard key={f.key} style={[styles.row, { gap: 12 }]}>
            <View style={{ flex: 1 }}>
              <Display size={16}>{f.label}</Display>
              <Caption>{f.hint}</Caption>
            </View>
            <Squircle radius={21} fill="rgba(247,241,241,0.8)" stroke={colors.ring} style={styles.amount}>
              <TextInput
                value={v[f.key]}
                onChangeText={set(f.key)}
                inputMode="decimal"
                accessibilityLabel={f.label}
                style={[styles.amountInput, { fontFamily: F.sansBold }]}
              />
              <Caption>{f.unit}</Caption>
            </Squircle>
          </InnerCard>
        ))}
      </GlassCard>

      <GlassCard tint="peach" style={{ gap: 16 }}>
        <View style={[styles.row, { gap: 12, alignItems: 'flex-start' }]}>
          <Squircle radius={20} fill={colors.primary} glow="button" style={styles.icon}>
            <Icon name="books" size={20} color={colors.white} />
          </Squircle>
          <View style={{ flex: 1, gap: 6 }}>
            <Display size={18}>{Z.madhhabs.title}</Display>
            <Body size={14} color="#4A4B57" lineHeight={24}>
              {Z.madhhabs.body}
            </Body>
          </View>
        </View>
        <SoftButton label={Z.madhhabs.cta} />
      </GlassCard>

      <Body size={12} weight="medium" color="#7A5C24" style={{ paddingHorizontal: 6 }}>
        {Z.disclaimer}
      </Body>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Squircle radius={24} fill="rgba(255,255,255,0.06)" glow="button" style={styles.stat}>
      <Caption color="#CFE3DB">{label}</Caption>
      <Display size={18} color={colors.white}>
        {value}
      </Display>
    </Squircle>
  );
}

function PriceField({ label, value, onChange }: { label: string; value: string; onChange: (t: string) => void }) {
  return (
    <InnerCard style={{ flex: 1, gap: 6 }}>
      <Caption>{label}</Caption>
      <TextInput value={value} onChangeText={onChange} inputMode="decimal" accessibilityLabel={label} style={[styles.price, { fontFamily: F.display }]} />
    </InnerCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  statusOff: { alignSelf: 'flex-start', minHeight: 26, paddingHorizontal: 10, borderRadius: 13, justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  stat: { flex: 1, paddingVertical: 12, paddingHorizontal: 14, gap: 4 },
  price: { fontSize: 22, color: colors.ink, paddingVertical: 0, minWidth: 0, textAlign: 'right' },
  amount: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 42, paddingHorizontal: 12 },
  amountInput: { width: 70, fontSize: 16, color: colors.ink, textAlign: 'left', paddingVertical: 0 },
  icon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
