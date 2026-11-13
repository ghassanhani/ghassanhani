import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { PageHeader } from '@/components/PageHeader';
import { Screen } from '@/components/Screen';
import { Squircle } from '@/components/Squircle';
import { AyahText, Body, Caption, Display } from '@/components/Typography';
import { Cta, GlassCard, HeroCard, InnerCard, SoftButton } from '@/components/ui';
import { ar, getAyah } from '@/content/quran';
import { hifzSession as S } from '@/content/worship';
import { colors } from '@/theme/tokens';

export default function HifzSessionScreen() {
  // Initial counts as drawn on the canvas (12 readings, 4 recitations).
  const [read, setRead] = useState(12);
  const [recite, setRecite] = useState(4);
  const [hidden, setHidden] = useState(false);
  const ayah = getAyah(S.surah, S.repeat.ayah);

  return (
    <Screen backdrop="mint" withTabBar={false} header={<PageHeader title={S.title} fallback="/hifz" />}>
      <HeroCard hero="teal" style={{ gap: 2 }}>
        <Body size={14} weight="medium" color={colors.gold}>
          {S.head.label}
        </Body>
        <Display size={34} color={colors.white} lineHeight={48}>
          {S.head.surah}
        </Display>
        <Body size={15} weight="bold" color={colors.white}>
          {S.head.range}
        </Body>
        <Caption color="rgba(255,255,255,0.75)">{S.head.meta}</Caption>
      </HeroCard>

      <GlassCard style={{ gap: 10 }}>
        <Display size={20}>{S.head.done}</Display>
        {S.steps.map((st) => (
          <InnerCard key={st.title} style={{ gap: 6 }}>
            <View style={[styles.row, { justifyContent: 'space-between' }]}>
              <View style={{ flex: 1 }}>
                <Display size={16}>{st.title}</Display>
                <Caption>{st.meta}</Caption>
              </View>
              {'cta' in st && st.cta ? <Cta label={st.cta} height={36} compact /> : null}
            </View>
            {'chain' in st && st.chain ? (
              <View style={[styles.row, { flexWrap: 'wrap', gap: 6 }]}>
                {st.chain.map((c, i) => (
                  <View key={c} style={[styles.link, i < st.current ? styles.linkDone : i === st.current ? styles.linkNow : null]}>
                    <Body size={12} weight="bold" lineHeight={16} color={i <= st.current ? colors.white : colors.muted}>
                      {c}
                    </Body>
                  </View>
                ))}
              </View>
            ) : null}
          </InnerCard>
        ))}
      </GlassCard>

      <GlassCard style={{ gap: 14 }}>
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <Display size={20}>{S.repeat.title}</Display>
          <SoftButton label={hidden ? 'أظهر الآية' : 'أخفِ الآية'} onPress={() => setHidden((h) => !h)} />
        </View>
        <InnerCard style={{ minHeight: 90, justifyContent: 'center' }}>
          {hidden ? (
            <Body size={14} color={colors.muted} style={{ textAlign: 'center' }}>
              {S.repeat.hidden}
            </Body>
          ) : (
            <AyahText size={22} lineHeight={44} style={ayah ? { fontFamily: ayah.fontFamily } : null}>
              {ayah ? ayah.text : '[نص الآية ٤ من سورة الملك · من نص تنزيل المعتمد]'}
            </AyahText>
          )}
        </InnerCard>
        <View style={[styles.row, { justifyContent: 'space-around' }]}>
          <Counter
            label={S.repeat.read}
            sub={S.repeat.readSub}
            n={read}
            of={S.repeat.target}
            color={colors.sky}
            onPress={() => setRead((x) => Math.min(S.repeat.target, x + 1))}
          />
          <Counter
            label={S.repeat.recite}
            sub={S.repeat.reciteSub}
            n={recite}
            of={S.repeat.target}
            color={colors.primary}
            onPress={() => {
              setRecite((x) => Math.min(S.repeat.target, x + 1));
              setHidden(true);
            }}
          />
        </View>
        <Caption style={{ textAlign: 'center' }}>{S.repeat.note}</Caption>
      </GlassCard>

      <GlassCard style={[styles.row, { gap: 12 }]}>
        <Squircle radius={20} fill={colors.primary} glow="button" style={styles.stepNo}>
          <Display size={16} color={colors.white}>
            {S.tasmee.step}
          </Display>
        </Squircle>
        <View style={{ flex: 1 }}>
          <Display size={17}>{S.tasmee.title}</Display>
          <Caption>{S.tasmee.meta}</Caption>
        </View>
        <Cta label={S.tasmee.cta} height={40} compact onPress={() => router.push(`/mushaf?page=${S.page}`)} />
      </GlassCard>

      <GlassCard style={{ gap: 10 }}>
        <Display size={20}>{S.after.title}</Display>
        <Body size={14} color="#4A4B57" lineHeight={24}>
          {S.after.body}
        </Body>
        <View style={[styles.row, { gap: 10 }]}>
          <Cta label={S.after.done} style={{ flex: 1 }} />
          <SoftButton label={S.after.weak} style={{ flex: 1 }} />
        </View>
      </GlassCard>

      <Caption style={{ paddingHorizontal: 6 }}>{S.note}</Caption>
    </Screen>
  );
}

function Counter({ label, sub, n, of, color, onPress }: { label: string; sub: string; n: number; of: number; color: string; onPress: () => void }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label} ${n} من ${of}`} onPress={onPress} style={{ alignItems: 'center', gap: 6 }}>
      <View style={{ width: 76, height: 76, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={76} height={76} style={{ position: 'absolute' }}>
          <Circle cx={38} cy={38} r={r} stroke="rgba(129,130,144,0.18)" strokeWidth={6} fill="#FFFFFF" />
          <Circle cx={38} cy={38} r={r} stroke={color} strokeWidth={6} fill="none" strokeLinecap="round" strokeDasharray={`${(c * n) / of} ${c}`} transform="rotate(-90 38 38)" />
        </Svg>
        <Display size={16}>{`${ar(n)}/${ar(of)}`}</Display>
      </View>
      <Body size={14} weight="bold">
        {label}
      </Body>
      <Caption>{sub}</Caption>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  link: { minWidth: 36, height: 28, paddingHorizontal: 8, borderRadius: 14, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(129,130,144,0.15)' },
  linkDone: { backgroundColor: colors.sky },
  linkNow: { backgroundColor: colors.primary },
  stepNo: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
