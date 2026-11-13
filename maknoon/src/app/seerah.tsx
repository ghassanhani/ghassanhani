import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { PageHeader } from '@/components/PageHeader';
import { Screen } from '@/components/Screen';
import { Squircle } from '@/components/Squircle';
import { Body, Caption, Display } from '@/components/Typography';
import { Chip, GlassCard, InnerCard, SuggestedChip } from '@/components/ui';
import { seerah as S } from '@/content/modules';
import { colors, space } from '@/theme/tokens';

type Filter = (typeof S.filters)[number]['id'];

/** Timeline: every event links to its ayat, hadith and people. Counts are display-only (design). */
export default function SeerahScreen() {
  const [f, setF] = useState<Filter>('all');
  const [open, setOpen] = useState<number | null>(S.badrIndex);
  const shown = S.events.map((e, i) => ({ e, i })).filter((x) => f === 'all' || f === 'people' || x.e.k === f);

  return (
    <Screen backdrop="sea" withTabBar={false} header={<PageHeader title={S.title} fallback="/library" />}>
      <Body size={14} color="#4A4B57">
        {S.intro}
      </Body>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rail} contentContainerStyle={styles.railContent}>
        {S.filters.map((x) => {
          const on = x.id === f;
          return (
            <Pressable key={x.id} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setF(x.id)}>
              <Squircle radius={21} fill={on ? colors.primary : 'rgba(255,255,255,0.7)'} glow={on ? 'button' : 'glass'} stroke={on ? undefined : '#FFFFFF'} style={styles.chip}>
                <Body size={14} weight={on ? 'bold' : 'medium'} color={on ? colors.white : colors.ink} lineHeight={20}>
                  {x.label}
                </Body>
              </Squircle>
            </Pressable>
          );
        })}
      </ScrollView>

      <View>
        {shown.map(({ e, i }, j) => {
          const isOpen = open === i;
          const last = j === shown.length - 1;
          return (
            <View key={e.t} style={[styles.row, { alignItems: 'stretch', gap: 12 }]}>
              <View style={{ alignItems: 'center', width: 16 }}>
                <View style={[styles.dot, isOpen && styles.dotOpen]} />
                {!last ? <View style={styles.line} /> : null}
              </View>
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: isOpen }} style={{ flex: 1, paddingBottom: 12 }} onPress={() => setOpen(isOpen ? null : i)}>
                <GlassCard style={{ padding: 16, gap: 8 }}>
                  <View style={[styles.row, { justifyContent: 'space-between' }]}>
                    <Display size={18}>{e.t}</Display>
                    <Chip label={e.k === 'battle' ? 'غزوة' : 'حدث'} tone={e.k === 'battle' ? 'pending' : 'suggested'} />
                  </View>
                  <Body size={13} color={colors.primary}>
                    {e.d}
                  </Body>
                  <View style={[styles.row, { gap: 6, flexWrap: 'wrap' }]}>
                    <Count text={`${e.a} آيات`} />
                    <Count text={`${e.h} أحاديث`} />
                    <Count text={`${e.p} أعلام`} />
                  </View>
                  {isOpen ? (
                    i === S.badrIndex ? (
                      <View style={{ gap: 8, marginTop: 4 }}>
                        <Caption>{S.badr.ayatLabel}</Caption>
                        <View style={[styles.row, { gap: 6, flexWrap: 'wrap' }]}>
                          {S.badr.ayat.map((a) => (
                            <InnerCard key={a} style={styles.pill}>
                              <Body size={13} weight="medium">
                                {a}
                              </Body>
                            </InnerCard>
                          ))}
                        </View>
                        <Caption>{S.badr.peopleLabel}</Caption>
                        <View style={[styles.row, { gap: 6, flexWrap: 'wrap' }]}>
                          {S.badr.people.map((a) => (
                            <InnerCard key={a} style={styles.pill}>
                              <Body size={13} weight="medium">
                                {a}
                              </Body>
                            </InnerCard>
                          ))}
                        </View>
                        <View style={[styles.row, { gap: 8 }]}>
                          <Caption style={{ flex: 1 }}>{S.badr.place}</Caption>
                          <SuggestedChip />
                        </View>
                      </View>
                    ) : (
                      <Caption>{S.otherOpen}</Caption>
                    )
                  ) : null}
                </GlassCard>
              </Pressable>
            </View>
          );
        })}
      </View>

      <Caption style={{ paddingHorizontal: 6 }}>{S.note}</Caption>
    </Screen>
  );
}

function Count({ text }: { text: string }) {
  return (
    <View style={styles.count}>
      <Body size={12} weight="medium" color={colors.primary} lineHeight={16}>
        {text}
      </Body>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  rail: { marginHorizontal: -space.gutter, flexGrow: 0 },
  railContent: { paddingHorizontal: space.gutter, gap: 9, paddingVertical: 2 },
  chip: { height: 42, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 16, height: 16, borderRadius: 8, marginTop: 20, borderWidth: 3, borderColor: colors.sky, backgroundColor: colors.white },
  dotOpen: { backgroundColor: colors.primary, borderWidth: 0, boxShadow: '0 0 0 5px rgba(3,90,95,0.15)' },
  line: { flex: 1, width: 2, backgroundColor: 'rgba(3,90,95,0.2)', marginTop: 4 },
  count: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 12, borderCurve: 'continuous', backgroundColor: 'rgba(3,90,95,0.08)' },
  pill: { paddingVertical: 6, paddingHorizontal: 12 },
});
