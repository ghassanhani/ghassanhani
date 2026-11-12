import { router } from 'expo-router';
import { Fragment } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Icon, type IconName } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Squircle } from '@/components/Squircle';
import { Body, Caption, Display } from '@/components/Typography';
import { Cta, GlassCard, HeroCard, IconBubble, InnerCard, PillButton, ProgressBar, Segments } from '@/components/ui';
import { quranHub as q } from '@/content/design';
import { colors, space } from '@/theme/tokens';

export default function QuranHubScreen() {
  return (
    <Screen backdrop="mint">
      <Display size={30} lineHeight={44} style={{ marginTop: 8 }}>
        {q.title}
      </Display>

      {/* Continue reading */}
      <HeroCard hero="teal" style={{ paddingTop: 30, gap: 4 }}>
        <Body size={14} weight="medium" color={colors.gold}>
          {q.resume.label}
        </Body>
        <Display size={40} color={colors.white} lineHeight={60}>
          {q.resume.surah}
        </Display>
        <Body size={12} color={colors.white}>
          {q.resume.meta}
        </Body>
        <View style={{ marginVertical: 18 }}>
          <ProgressBar value={q.resume.progress} height={10} fill="#4FD3E3" track="rgba(255,255,255,0.3)" />
        </View>
        <View style={styles.row}>
          <PillButton label="المصحف" icon="quran2" onPress={() => router.push('/mushaf')} />
          <PillButton label="آيات للدراسة" variant="glass" />
        </View>
      </HeroCard>

      {/* Khatma */}
      <GlassCard tint="lavender">
        <View style={styles.between}>
          <View>
            <Display size={24}>{q.khatma.title}</Display>
            <Body size={13} color={colors.primary}>
              {q.khatma.plan}
            </Body>
          </View>
          <Ring value={q.khatma.doneFraction} label={q.khatma.done} unit={q.khatma.unit} />
        </View>
        <InnerCard style={[styles.between, { marginTop: 14, alignItems: 'center' }]}>
          <View>
            <Caption color={colors.ink}>{q.khatma.wirdLabel}</Caption>
            <Body size={14} weight="bold">
              {q.khatma.wird}
            </Body>
          </View>
          <Cta label={q.khatma.cta} height={40} compact onPress={() => router.push('/mushaf')} />
        </InnerCard>
      </GlassCard>

      {/* Shortcuts rail */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rail} contentContainerStyle={styles.railContent}>
        {q.shortcuts.map((s) => (
          <Pressable key={s.title} accessibilityRole="button" onPress={() => s.route && router.push(s.route)}>
            <GlassCard style={styles.mini}>
              <IconBubble name={s.icon} size={31} iconSize={16} color={colors.ink} />
              <Display size={16} lineHeight={21} style={{ marginTop: 'auto' }}>
                {s.title}
              </Display>
            </GlassCard>
          </Pressable>
        ))}
      </ScrollView>

      {/* Listen */}
      <GlassCard tint="mint">
        <View style={styles.between}>
          <View style={{ flex: 1 }}>
            <Display size={24}>{q.listen.title}</Display>
            <Body size={15} weight="medium">
              {q.listen.surah}
            </Body>
            <Body size={13} color={colors.primary}>
              {q.listen.meta}
            </Body>
          </View>
          <Squircle radius={25} fill={colors.primary} glow="button" style={[styles.center, { width: 50, height: 50, alignSelf: 'flex-end' }]}>
            <Icon name="play" size={20} color={colors.white} />
          </Squircle>
        </View>
      </GlassCard>

      {/* Memorise */}
      <Display size={22}>{q.hifz.title}</Display>
      <GlassCard>
        <View style={[styles.between, { alignItems: 'center' }]}>
          <Display size={18}>{q.hifz.plan}</Display>
          <Body size={13} color={colors.muted}>
            {q.hifz.count}
          </Body>
        </View>
        <View style={{ marginTop: 12, marginBottom: 6 }}>
          <Segments segments={['on', 'on', 'off']} />
        </View>
        {q.hifz.items.map((it) => (
          <View key={it.title} style={[styles.row, { paddingVertical: 12, gap: 14 }]}>
            <View style={[styles.dotRing, it.state === 'warn' && { borderColor: '#F2C7C7' }]} />
            <View>
              <Display size={17}>{it.title}</Display>
              <Body size={12} color={colors.primary}>
                {it.meta}
              </Body>
            </View>
          </View>
        ))}
        <Cta label={q.hifz.cta} style={{ marginTop: 8 }} />
      </GlassCard>
      <View style={styles.row}>
        {q.hifz.tools.map((t) => (
          <GlassCard key={t.title} style={[styles.toolCard]}>
            <View style={[styles.row, { gap: 10 }]}>
              <IconBubble name={t.icon} size={31} iconSize={16} color={colors.ink} />
              <View>
                <Display size={15} lineHeight={20}>
                  {t.title}
                </Display>
                <Caption color={colors.primary}>{t.meta}</Caption>
              </View>
            </View>
          </GlassCard>
        ))}
      </View>

      {/* Understand */}
      <Display size={22}>{q.understand.title}</Display>
      <GlassCard>
        {q.understand.items.map((it, i) => (
          <Fragment key={it.title}>
            {i ? <View style={styles.hairline} /> : null}
            <Pressable accessibilityRole="button" style={[styles.between, { alignItems: 'center', paddingVertical: 12 }]}>
              <View style={{ flex: 1 }}>
                <Display size={17}>{it.title}</Display>
                <Body size={12} color={colors.primary}>
                  {it.meta}
                </Body>
              </View>
              <Icon name="chevronLeft" size={20} color={colors.ink} />
            </Pressable>
          </Fragment>
        ))}
        <Cta label={q.understand.cta} style={{ marginTop: 12 }} />
      </GlassCard>

      {/* My Quran */}
      <Display size={22}>{q.mine.title}</Display>
      <View style={styles.row}>
        {q.mine.items.map((m) => (
          <GlassCard key={m.title} style={styles.mineCard}>
            <IconBubble name={m.icon as IconName} size={31} iconSize={16} color={colors.ink} />
            <View style={{ marginTop: 'auto' }}>
              <Display size={16}>{m.title}</Display>
              <Body size={13} color={colors.primary}>
                {m.count}
              </Body>
            </View>
          </GlassCard>
        ))}
      </View>
    </Screen>
  );
}

function Ring({ value, label, unit }: { value: number; label: string; unit: string }) {
  const size = 52;
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <View style={[styles.center, { width: size, height: size }]}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(129,130,144,0.2)" strokeWidth={5} fill="#FFFFFF" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#7C5CF0"
          strokeWidth={5}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${Math.max(c * value, c * 0.08)} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Display size={15} lineHeight={17}>
        {label}
      </Display>
      <Body size={9} lineHeight={11} color={colors.muted}>
        {unit}
      </Body>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  center: { alignItems: 'center', justifyContent: 'center' },
  rail: { marginHorizontal: -space.gutter, flexGrow: 0 },
  railContent: { paddingHorizontal: space.gutter, gap: 9 },
  mini: { width: 112, height: 116, padding: 14 },
  dotRing: { width: 18, height: 18, borderRadius: 9, borderWidth: 4, borderColor: colors.sky, backgroundColor: colors.white },
  toolCard: { flex: 1, paddingVertical: 14, paddingHorizontal: 14, borderRadius: 24 },
  hairline: { height: 1, backgroundColor: colors.hairline },
  mineCard: { flex: 1, height: 116, padding: 14 },
});
