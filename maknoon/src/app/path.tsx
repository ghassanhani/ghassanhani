import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { PageHeader } from '@/components/PageHeader';
import { Screen } from '@/components/Screen';
import { Body, Caption, Display } from '@/components/Typography';
import { Chip, CountBadge, Cta, GlassCard, HeroCard, InnerCard, Segments } from '@/components/ui';
import { path as P } from '@/content/modules';
import { colors } from '@/theme/tokens';

/** Learning path: an ordered walk through graph nodes. Progress shown is the design's sample (station 5). */
export default function PathScreen() {
  const cur = P.hero.current;
  return (
    <Screen backdrop="sea" withTabBar={false} header={<PageHeader title={P.title} />}>
      <HeroCard hero="teal" style={{ gap: 6 }}>
        <Body size={13} weight="medium" color={colors.gold}>
          {P.hero.label}
        </Body>
        <Display size={30} color={colors.white} lineHeight={44}>
          {P.hero.title}
        </Display>
        <Body size={13} color="rgba(255,255,255,0.9)" lineHeight={22}>
          {P.hero.body}
        </Body>
        <View style={[styles.row, { justifyContent: 'space-between', marginTop: 6 }]}>
          <Body size={13} weight="bold" color={colors.white}>
            {P.hero.progress}
          </Body>
          <Caption color={colors.gold}>{P.hero.saved}</Caption>
        </View>
        <Segments segments={Array.from({ length: P.hero.total }, (_, i) => (i < cur - 1 ? 'on' : i === cur - 1 ? 'part' : 'off'))} />
      </HeroCard>

      <View>
        {P.stations.map((s, i) => {
          const n = i + 1;
          const done = n < cur;
          const isCur = n === cur;
          const last = i === P.stations.length - 1;
          return (
            <View key={s.title} style={[styles.row, { alignItems: 'stretch', gap: 12 }]}>
              <View style={{ alignItems: 'center', width: 16 }}>
                <View style={[styles.dot, done && styles.dotDone, isCur && styles.dotCur]} />
                {!last ? <View style={styles.line} /> : null}
              </View>
              <View style={{ flex: 1, paddingBottom: 12 }}>
                <GlassCard style={{ padding: 16, gap: 8 }}>
                  <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'flex-start' }]}>
                    <View style={{ flex: 1 }}>
                      <Display size={17}>{s.title}</Display>
                      <Caption>{s.meta}</Caption>
                    </View>
                    {done ? <Chip label={P.done} tone="reviewed" badge /> : isCur ? <CountBadge value={P.currentChip} /> : 'n' in s && s.n ? <Caption>{P.stationLabel(s.n)}</Caption> : null}
                  </View>
                  {isCur && 'steps' in s && s.steps ? (
                    <View style={{ gap: 8 }}>
                      {s.steps.map((st) => (
                        <Pressable key={st.text} accessibilityRole="link" onPress={() => router.push(st.route as never)}>
                          <InnerCard style={[styles.row, { gap: 10, paddingVertical: 10 }]}>
                            <CountBadge value={st.tag} />
                            <Body size={13} weight="medium" style={{ flex: 1 }}>
                              {st.text}
                            </Body>
                            <Icon name="chevronLeft" size={18} color={colors.ink} />
                          </InnerCard>
                        </Pressable>
                      ))}
                      {s.cta ? <Cta label={s.cta.label} onPress={() => router.push(s.cta!.route as never)} /> : null}
                    </View>
                  ) : null}
                </GlassCard>
              </View>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 16, height: 16, borderRadius: 8, marginTop: 22, borderWidth: 3, borderColor: colors.sky, backgroundColor: colors.white },
  dotDone: { backgroundColor: colors.sky, borderWidth: 0 },
  dotCur: { backgroundColor: colors.primary, borderWidth: 0, boxShadow: '0 0 0 5px rgba(3,90,95,0.15)' },
  line: { flex: 1, width: 2, backgroundColor: 'rgba(3,90,95,0.2)', marginTop: 4 },
});
