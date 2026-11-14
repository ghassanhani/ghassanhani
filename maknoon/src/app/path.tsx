import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Pressable } from '@/components/Tap';
import { Icon } from '@/components/Icon';
import { PageHeader } from '@/components/PageHeader';
import { Screen } from '@/components/Screen';
import { Body, Caption, Display } from '@/components/Typography';
import { Chip, CountBadge, Cta, GlassCard, HeroCard, InnerCard, Segments } from '@/components/ui';
import { path as P } from '@/content/modules';
import { ar } from '@/content/quran';
import { usePrefs } from '@/store/prefs';
import { colors } from '@/theme/tokens';

/**
 * Learning path: an ordered walk through real nodes — ayat (with their tafsir), hadith (with their
 * gradings) and tools. The reader marks a station done themselves; progress stays on the device.
 * The open station is the first one not done (or the one the reader taps).
 */
export default function PathScreen() {
  const [prefs, setPrefs] = usePrefs();
  const done = new Set(prefs.pathDone);
  const firstOpen = P.stations.findIndex((_, i) => !done.has(i));
  const [openAt, setOpenAt] = useState<number | null>(null);
  const open = openAt ?? (firstOpen < 0 ? null : firstOpen);
  const toggleDone = (i: number) =>
    setPrefs((p) => ({ pathDone: p.pathDone.includes(i) ? p.pathDone.filter((x) => x !== i) : [...p.pathDone, i] }));
  const count = (s: (typeof P.stations)[number]) => {
    const a = s.steps.filter((x) => x.tag === 'آ').length;
    const h = s.steps.filter((x) => x.tag === 'ح').length;
    const n = (k: number, one: string, two: string, many: string) => (k === 1 ? one : k === 2 ? two : `${ar(k)} ${many}`);
    return [a ? n(a, 'آية', 'آيتان', 'آيات') : '', h ? n(h, 'حديث', 'حديثان', 'أحاديث') : '', s.cta ? 'أداة' : ''].filter(Boolean).join(' · ');
  };
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
            {`أنجزت ${ar(done.size)} من ${ar(P.hero.total)}`}
          </Body>
          <Caption color={colors.gold}>{P.hero.saved}</Caption>
        </View>
        <Segments segments={P.stations.map((_, i) => (done.has(i) || i === open ? 'on' : 'off'))} />
      </HeroCard>

      <View>
        {P.stations.map((s, i) => {
          const isDone = done.has(i);
          const isOpen = i === open;
          const last = i === P.stations.length - 1;
          return (
            <View key={s.title} style={[styles.row, { alignItems: 'stretch', gap: 12 }]}>
              <View style={{ alignItems: 'center', width: 16 }}>
                <View style={[styles.dot, isDone && styles.dotDone, isOpen && styles.dotCur]} />
                {!last ? <View style={styles.line} /> : null}
              </View>
              <View style={{ flex: 1, paddingBottom: 12 }}>
                <GlassCard style={{ padding: 16, gap: 8 }}>
                  <Pressable accessibilityRole="button" accessibilityState={{ expanded: isOpen }} onPress={() => setOpenAt(isOpen ? -1 : i)} style={[styles.row, { justifyContent: 'space-between', alignItems: 'flex-start' }]}>
                    <View style={{ flex: 1 }}>
                      <Display size={17}>{s.title}</Display>
                      <Caption>{`المحطة ${ar(i + 1)} · ${count(s)}`}</Caption>
                    </View>
                    {isDone ? <Chip label={P.done} tone="reviewed" badge /> : <Icon name={isOpen ? 'chevronDown' : 'chevronLeft'} size={18} color={colors.ink} />}
                  </Pressable>
                  {isOpen ? (
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
                      <Pressable accessibilityRole="button" onPress={() => toggleDone(i)}>
                        <Body size={13} weight="bold" color={isDone ? colors.muted : colors.primary} style={{ textAlign: 'center', paddingVertical: 6 }}>
                          {isDone ? P.undo : P.markDone}
                        </Body>
                      </Pressable>
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
