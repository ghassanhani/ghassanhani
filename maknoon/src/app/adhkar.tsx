import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Icon } from '@/components/Icon';
import { PageHeader } from '@/components/PageHeader';
import { Screen } from '@/components/Screen';
import { Squircle } from '@/components/Squircle';
import { Body, Caption, Display } from '@/components/Typography';
import { Chip, GlassCard, HeroCard, IconBubble } from '@/components/ui';
import { ar } from '@/content/quran';
import { adhkar, adhkarOrder, adhkarScreen as A, type Dhikr } from '@/content/worship';
import { colors, space } from '@/theme/tokens';
import { stripTashkeel } from '@/content/text';
import { usePrefs } from '@/store/prefs';
import { METHODS, type MethodKey, cityByKey, usePrayerDay } from '@/content/prayer';

type Cat = (typeof adhkarOrder)[number];

export default function AdhkarScreen() {
  const { cat: asked } = useLocalSearchParams<{ cat?: string }>();
  const [tab, setTab] = useState<Cat>((adhkarOrder as readonly string[]).includes(asked ?? '') ? (asked as Cat) : 'sabah');
  // «الآن بعد العصر»: the last prayer that has come in, from the on-device times.
  const [prefs] = usePrefs();
  const city = cityByKey(prefs.city);
  const pd = usePrayerDay(city, prefs.asr, (METHODS.find((m) => m.key === prefs.prayerMethod)?.key ?? city.method) as MethodKey);
  // Session-only counters (the canvas: «العدّاد لعدد المرات فقط، لا يُحفظ ولا يُقارن»).
  const [counts, setCounts] = useState<Record<string, number>>({});
  const cat = adhkar[tab];
  const done = cat.items.filter((d) => (counts[d.id] ?? 0) >= d.n).length;

  return (
    <Screen backdrop="dune" withTabBar={false} header={<PageHeader title={A.title} />}>
      <HeroCard hero="forest" style={{ gap: 4 }}>
        <View style={styles.between}>
          <Body size={14} weight="medium" color={colors.gold}>
            {pd.prev ? `الآن بعد ${pd.prev.name}` : 'الآن قبل الفجر'}
          </Body>
          <IconBubble name="moonCloud" iconSize={20} color={colors.white} fill="rgba(255,255,255,0.18)" />
        </View>
        <Display size={28} color={colors.white} lineHeight={40}>
          {cat.title}
        </Display>
        <Body size={13} color="rgba(255,255,255,0.85)">
          {cat.sub}
        </Body>
        <View style={[styles.between, { alignItems: 'center', marginTop: 10 }]}>
          <Body size={13} weight="bold" color={colors.white}>
            {A.done}
          </Body>
          <Body size={13} weight="bold" color={colors.white}>{`${ar(done)} من ${ar(cat.items.length)}`}</Body>
        </View>
        <View style={[styles.row, { gap: 4 }]}>
          {cat.items.map((d, i) => (
            <View key={d.id} style={[styles.seg, { backgroundColor: i < done ? '#A0E298' : 'rgba(255,255,255,0.22)' }]} />
          ))}
        </View>
      </HeroCard>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rail} contentContainerStyle={styles.railContent}>
        {adhkarOrder.map((k) => {
          const on = k === tab;
          return (
            <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setTab(k)}>
              <Squircle radius={21} fill={on ? colors.primary : 'rgba(255,255,255,0.7)'} glow={on ? 'button' : 'glass'} stroke={on ? undefined : '#FFFFFF'} style={styles.chip}>
                <Body size={14} weight={on ? 'bold' : 'medium'} color={on ? colors.white : colors.ink} lineHeight={20}>
                  {adhkar[k].label}
                </Body>
              </Squircle>
            </Pressable>
          );
        })}
      </ScrollView>

      {cat.items.map((d) => (
        <DhikrCard
          key={d.id}
          d={d}
          count={counts[d.id] ?? 0}
          onTap={() => setCounts((c) => ({ ...c, [d.id]: (c[d.id] ?? 0) >= d.n ? 0 : (c[d.id] ?? 0) + 1 }))}
        />
      ))}

      <Caption style={{ paddingHorizontal: 6 }}>{A.note}</Caption>
    </Screen>
  );
}

function DhikrCard({ d, count, onTap }: { d: Dhikr; count: number; onTap: () => void }) {
  const [prefs] = usePrefs();
  const finished = count >= d.n;
  const pct = Math.min(1, count / d.n);
  const r = 29;
  const circ = 2 * Math.PI * r;
  return (
    <GlassCard style={{ gap: 10 }}>
      <View style={[styles.between, { gap: 12 }]}>
        <View style={{ flex: 1, gap: 6 }}>
          {d.label ? (
            <Body size={13} weight="bold" color={colors.primary}>
              {d.label}
            </Body>
          ) : null}
          <Display size={19} lineHeight={32}>
            {prefs.hideTashkeel ? stripTashkeel(d.text) : d.text}
          </Display>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={finished ? 'تم، اضغط لإعادة العدّ' : 'عُدّ مرة'} onPress={onTap} style={styles.ring}>
          <Svg width={64} height={64} style={{ position: 'absolute' }}>
            <Circle cx={32} cy={32} r={r} stroke="rgba(129,130,144,0.18)" strokeWidth={6} fill="none" />
            <Circle
              cx={32}
              cy={32}
              r={r}
              stroke={finished ? colors.primary : colors.sky}
              strokeWidth={6}
              fill="none"
              strokeDasharray={`${circ * pct} ${circ}`}
              transform="rotate(-90 32 32)"
            />
          </Svg>
          <View style={[styles.inner, finished && { backgroundColor: colors.primary }]}>
            {finished ? (
              <Icon name="badge" size={20} color={colors.white} />
            ) : (
              <Body size={13} weight="bold" color={colors.primary} lineHeight={18}>
                {d.n === 1 ? 'مرة' : `${ar(count)}/${ar(d.n)}`}
              </Body>
            )}
          </View>
        </Pressable>
      </View>
      {d.ayah ? (
        <Pressable accessibilityRole="link" style={[styles.row, { gap: 4 }]}>
          <Body size={13} weight="medium" color={colors.primary}>
            {A.mushafLink}
          </Body>
          <Icon name="chevronLeft" size={16} color={colors.primary} />
        </Pressable>
      ) : null}
      {d.virtue ? <Body size={13} color="#4A4B57">{`${A.virtue} ${d.virtue}`}</Body> : null}
      {'pending' in d.s ? (
        <Chip label={A.pending} tone="pending" />
      ) : (
        <View style={[styles.row, { gap: 8 }]}>
          <Chip label={d.s.chip} tone={d.s.chip === 'صحيح' ? 'reviewed' : 'pending'} />
          <Caption>{d.s.src}</Caption>
        </View>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  seg: { flex: 1, height: 10, borderRadius: 5 },
  rail: { marginHorizontal: -space.gutter, flexGrow: 0 },
  railContent: { paddingHorizontal: space.gutter, gap: 9, paddingVertical: 2 },
  chip: { height: 42, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  ring: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  inner: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
});
