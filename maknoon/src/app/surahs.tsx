import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { PageHeader } from '@/components/PageHeader';
import { Screen } from '@/components/Screen';
import { Squircle } from '@/components/Squircle';
import { Body, Caption, Display } from '@/components/Typography';
import { Chip, Cta, GlassCard, HeroCard } from '@/components/ui';
import { ar } from '@/content/quran';
import { quranIndex, surahIndexScreen as S } from '@/content/worship';
import { F } from '@/theme/fonts';
import { colors, space } from '@/theme/tokens';

// Search ignores tashkeel and hamza forms (search side only; display keeps the data as is).
const norm = (s: string) =>
  s
    .replace(/[ً-ٰٟۖ-ۭـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

export default function SurahIndexScreen() {
  const [tab, setTab] = useState(0);
  const [q, setQ] = useState('');
  const surahs = useMemo(() => {
    const n = norm(q.trim());
    if (!n) return quranIndex.surahs;
    return quranIndex.surahs.filter((s) => String(s.n) === n || norm(s.name).includes(n));
  }, [q]);
  const name = (n: number) => quranIndex.surahs[n - 1].name;

  return (
    <Screen backdrop="mint" withTabBar={false} header={<PageHeader title={S.title} fallback="/quran" />}>
      <Squircle radius={32} fill="rgba(255,255,255,0.5)" glow="glass" style={styles.field}>
        <Icon name="search" size={22} color="#35625B" />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={S.searchPlaceholder}
          placeholderTextColor={colors.muted}
          accessibilityLabel={S.searchPlaceholder}
          style={[styles.input, { fontFamily: F.sans }]}
        />
      </Squircle>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rail} contentContainerStyle={styles.railContent}>
        {S.tabs.map((t, i) => {
          const on = i === tab;
          return (
            <Pressable key={t} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setTab(i)}>
              <Squircle radius={21} fill={on ? colors.primary : 'rgba(255,255,255,0.7)'} glow={on ? 'button' : 'glass'} stroke={on ? undefined : '#FFFFFF'} style={styles.chip}>
                <Body size={14} weight={on ? 'bold' : 'medium'} color={on ? colors.white : colors.ink} lineHeight={20}>
                  {t}
                </Body>
              </Squircle>
            </Pressable>
          );
        })}
      </ScrollView>

      <HeroCard hero="teal" style={[styles.row, { justifyContent: 'space-between', paddingVertical: 20 }]}>
        <View>
          <Body size={13} weight="medium" color={colors.gold}>
            {S.lastRead.label}
          </Body>
          <Display size={24} color={colors.white}>
            {S.lastRead.title}
          </Display>
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.push('/mushaf')}>
          <Squircle radius={24} fill={colors.white} style={styles.resume}>
            <Display size={14}>{S.lastRead.cta}</Display>
          </Squircle>
        </Pressable>
      </HeroCard>

      {tab === 0 ? (
        <GlassCard style={{ paddingVertical: 8 }}>
          {surahs.map((s, i) => (
            <Pressable key={s.n} accessibilityRole="button" onPress={() => router.push('/mushaf')} style={[styles.row, styles.surahRow, i > 0 && styles.sep]}>
              <Squircle radius={12} fill="rgba(3,90,95,0.08)" style={styles.num}>
                <Display size={14} color={colors.primary}>
                  {ar(s.n)}
                </Display>
              </Squircle>
              <View style={{ flex: 1 }}>
                <Display size={18}>{s.name}</Display>
                <Body size={12} color={colors.primary}>{`${s.type} · ${ar(s.ayat)} آية`}</Body>
              </View>
              <Caption>{`ص ${ar(s.page)}`}</Caption>
            </Pressable>
          ))}
          {!surahs.length ? <Caption style={{ paddingVertical: 12 }}>لا نتائج</Caption> : null}
        </GlassCard>
      ) : null}

      {tab === 1 ? (
        <View style={styles.grid}>
          {quranIndex.juz.map((j) => (
            <GlassCard key={j.juz} style={styles.juz}>
              <Caption>الجزء</Caption>
              <Display size={26}>{ar(j.juz)}</Display>
              <Body size={12} color={colors.primary}>{`${name(j.surah)} ${ar(j.ayah)}`}</Body>
            </GlassCard>
          ))}
        </View>
      ) : null}

      {tab === 2 ? (
        <GlassCard style={{ gap: 4 }}>
          <Display size={22}>{S.tabs[2]}</Display>
          {S.mine.map((m, i) => (
            <View key={m.title} style={[styles.row, { paddingVertical: 12, justifyContent: 'space-between' }, i > 0 && styles.sep]}>
              <View>
                <Display size={18}>{m.title}</Display>
                <Body size={12} color={colors.primary}>
                  {m.meta}
                </Body>
              </View>
              <Chip label={m.chip} tone={m.state === 'done' ? 'reviewed' : 'suggested'} badge={m.state === 'done'} />
            </View>
          ))}
          <Cta label={S.mineCta} style={{ marginTop: 8 }} onPress={() => router.push('/hifz')} />
        </GlassCard>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  field: { height: 56, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18 },
  input: { flex: 1, minWidth: 0, fontSize: 15, color: colors.ink, textAlign: 'right', paddingVertical: 0 },
  rail: { marginHorizontal: -space.gutter, flexGrow: 0 },
  railContent: { paddingHorizontal: space.gutter, gap: 9, paddingVertical: 2 },
  chip: { height: 42, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  resume: { height: 44, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center' },
  surahRow: { gap: 12, paddingVertical: 12 },
  sep: { borderTopWidth: 1, borderTopColor: colors.hairline },
  num: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  juz: { width: '48.3%', padding: 16, gap: 2 },
});
