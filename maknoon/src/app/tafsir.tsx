import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Pressable } from '@/components/Tap';
import { Icon } from '@/components/Icon';
import { PageHeader } from '@/components/PageHeader';
import { Screen } from '@/components/Screen';
import { Squircle } from '@/components/Squircle';
import { Body, Caption, Display } from '@/components/Typography';
import { Chip, GlassCard, HeroCard } from '@/components/ui';
import { isInstalled, packs } from '@/content/packs';
import { ar, ayatLabel } from '@/content/quran';
import { quranIndex } from '@/content/worship';
import { usePrefs } from '@/store/prefs';
import { readingAt } from '@/store/reading';
import { F } from '@/theme/fonts';
import { colors } from '@/theme/tokens';

const norm = (s: string) =>
  s
    .replace(/[ً-ٰٟۖ-ۭـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

/**
 * The tafsir section: carry on from where the reader is, pick any surah (its ayat open one by one,
 * each with its tafsir), and see which tafsir books are on the phone.
 */
export default function TafsirScreen() {
  const [prefs] = usePrefs();
  const r = readingAt(prefs.lastPage);
  const [q, setQ] = useState('');
  const surahs = useMemo(() => {
    const n = norm(q.trim());
    if (!n) return quranIndex.surahs;
    return quranIndex.surahs.filter((s) => String(s.n) === n || norm(s.name).includes(n));
  }, [q]);

  return (
    <Screen backdrop="sand" withTabBar={false} header={<PageHeader title="التفسير" fallback="/library" />}>
      <HeroCard hero="teal" style={[styles.row, { justifyContent: 'space-between', paddingVertical: 20 }]}>
        <View style={{ flex: 1 }}>
          <Body size={13} weight="medium" color={colors.gold}>
            تفسير موضع قراءتك
          </Body>
          <Display size={22} color={colors.white}>
            {`${r.surahName} · الآية ${ar(r.ayah)}`}
          </Display>
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.push(`/ayah/${r.surah}:${r.ayah}`)}>
          <Squircle radius={24} fill={colors.white} style={styles.cta}>
            <Display size={14}>افتح</Display>
          </Squircle>
        </Pressable>
      </HeroCard>

      <Display size={21}>كتب التفسير</Display>
      <GlassCard style={{ paddingVertical: 8 }}>
        {packs.map((p, i) => {
          const have = isInstalled(p.slug);
          return (
            <Pressable key={p.slug} accessibilityRole="button" onPress={() => router.push(have ? `/tafsir-book/${p.slug}` : '/settings')} style={[styles.row, styles.item, i > 0 && styles.sep]}>
              <View style={{ flex: 1 }}>
                <Display size={16}>{p.title}</Display>
                {p.publisher ? <Caption>{p.publisher}</Caption> : null}
              </View>
              {have ? <Chip label="على جهازك" tone="reviewed" /> : <Body size={13} color={colors.primary}>تنزيل ‹</Body>}
            </Pressable>
          );
        })}
      </GlassCard>

      <Display size={21}>اختر سورة</Display>
      <Squircle radius={28} fill="rgba(255,255,255,0.6)" glow="glass" style={styles.field}>
        <Icon name="search" size={20} color="#35625B" />
        <TextInput value={q} onChangeText={setQ} placeholder="ابحث باسم السورة أو رقمها" placeholderTextColor={colors.muted} accessibilityLabel="ابحث عن سورة" style={[styles.input, { fontFamily: F.sans }]} />
      </Squircle>
      <GlassCard style={{ paddingVertical: 8 }}>
        {surahs.map((s, i) => (
          <Pressable key={s.n} accessibilityRole="link" onPress={() => router.push(`/surah/${s.n}`)} style={[styles.row, styles.item, i > 0 && styles.sep]}>
            <Squircle radius={12} fill="rgba(3,90,95,0.08)" style={styles.num}>
              <Display size={14} color={colors.primary}>
                {ar(s.n)}
              </Display>
            </Squircle>
            <View style={{ flex: 1 }}>
              <Display size={17}>{s.name}</Display>
              <Body size={12} color={colors.primary}>{`${s.type} · ${ayatLabel(s.ayat)}`}</Body>
            </View>
            <Icon name="chevronLeft" size={18} color={colors.ink} />
          </Pressable>
        ))}
        {!surahs.length ? <Caption style={{ paddingVertical: 12 }}>لا نتائج</Caption> : null}
      </GlassCard>
      <Caption style={{ textAlign: 'center' }}>اختر السورة ثم الآية لتقرأ تفسيرها. نصوص التفاسير كما نُشرت في رتق.</Caption>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  item: { gap: 12, paddingVertical: 12 },
  sep: { borderTopWidth: 1, borderTopColor: colors.hairline },
  num: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  cta: { height: 44, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center' },
  field: { height: 52, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  input: { flex: 1, minWidth: 0, fontSize: 15, color: colors.ink, textAlign: 'right', paddingVertical: 0 },
});
