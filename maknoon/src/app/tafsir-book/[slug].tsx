import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Pressable } from '@/components/Tap';
import { Icon } from '@/components/Icon';
import { MadinahAyah } from '@/components/MadinahAyah';
import { PageHeader } from '@/components/PageHeader';
import { Screen } from '@/components/Screen';
import { Squircle } from '@/components/Squircle';
import { TafsirText } from '@/components/TafsirText';
import { Body, Caption, Display } from '@/components/Typography';
import { GlassCard, InnerCard } from '@/components/ui';
import { packs, readTafsir, type PackRow } from '@/content/packs';
import { ar, ayatLabel } from '@/content/quran';
import { quranIndex } from '@/content/worship';
import { usePrefs } from '@/store/prefs';
import { readingAt } from '@/store/reading';
import { F } from '@/theme/fonts';
import { colors } from '@/theme/tokens';

const STEP = 10;
const norm = (s: string) => s.replace(/[ً-ٰٟ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

/**
 * One tafsir book, read surah by surah: each ayah (Madinah glyphs) followed by this tafsir's
 * passage on it, exactly as published (the publisher's text, paginated only). Ten ayat at a time.
 */
export default function TafsirBookScreen() {
  const { slug = 'tafsir-almokhtassar' } = useLocalSearchParams<{ slug: string }>();
  const book = packs.find((p) => p.slug === slug);
  const [prefs] = usePrefs();
  const [surah, setSurah] = useState<number | null>(null);
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const n = norm(q.trim());
    return n ? quranIndex.surahs.filter((s) => String(s.n) === n || norm(s.name).includes(n)) : quranIndex.surahs;
  }, [q]);
  const here = readingAt(prefs.lastPage);

  return (
    <Screen backdrop="sand" withTabBar={false} header={<PageHeader title={book?.title ?? 'التفسير'} fallback="/tafsir" />}>
      {surah ? (
        <SurahTafsir slug={slug} surah={surah} back={() => setSurah(null)} />
      ) : (
        <>
          <Pressable accessibilityRole="button" onPress={() => setSurah(here.surah)}>
            <GlassCard style={[styles.row, { gap: 12 }]}>
              <View style={{ flex: 1 }}>
                <Caption color={colors.primary}>تابع من موضع قراءتك</Caption>
                <Display size={18}>{`سُورَةُ ${quranIndex.surahs[here.surah - 1]?.name ?? ''}`}</Display>
              </View>
              <Icon name="chevronLeft" size={18} color={colors.ink} />
            </GlassCard>
          </Pressable>
          <Squircle radius={28} fill="rgba(255,255,255,0.6)" glow="glass" style={styles.field}>
            <Icon name="search" size={20} color="#35625B" />
            <TextInput value={q} onChangeText={setQ} placeholder="ابحث باسم السورة أو رقمها" placeholderTextColor={colors.muted} accessibilityLabel="ابحث عن سورة" style={[styles.input, { fontFamily: F.sans }]} />
          </Squircle>
          <GlassCard style={{ paddingVertical: 8 }}>
            {list.map((s, i) => (
              <Pressable key={s.n} accessibilityRole="button" onPress={() => setSurah(s.n)} style={[styles.row, styles.item, i > 0 && styles.sep]}>
                <View style={styles.num}>
                  <Body size={13} weight="bold" color={colors.primary} lineHeight={18}>
                    {ar(s.n)}
                  </Body>
                </View>
                <View style={{ flex: 1 }}>
                  <Display size={17}>{s.name}</Display>
                  <Caption>{`${s.type} · ${ayatLabel(s.ayat)}`}</Caption>
                </View>
                <Icon name="chevronLeft" size={18} color={colors.ink} />
              </Pressable>
            ))}
          </GlassCard>
        </>
      )}
      {book ? <Caption style={{ textAlign: 'center' }}>{`${book.title}${book.publisher ? ` · ${book.publisher}` : ''} · ${book.license}`}</Caption> : null}
    </Screen>
  );
}

function SurahTafsir({ slug, surah, back }: { slug: string; surah: number; back: () => void }) {
  const meta = quranIndex.surahs[surah - 1];
  const [count, setCount] = useState(STEP);
  const [rows, setRows] = useState<(PackRow | null)[]>([]);
  useEffect(() => {
    let live = true;
    const n = Math.min(count, meta.ayat);
    Promise.all(Array.from({ length: n }, (_, i) => readTafsir(slug, surah, i + 1).catch(() => null))).then((r) => live && setRows(r));
    return () => {
      live = false;
    };
  }, [slug, surah, count, meta.ayat]);

  return (
    <>
      <Pressable accessibilityRole="button" onPress={back}>
        <Body size={13} color={colors.primary}>
          ‹ كل السور
        </Body>
      </Pressable>
      <Display size={22}>{`سُورَةُ ${meta.name}`}</Display>
      {!rows.length ? <ActivityIndicator color={colors.primary} /> : null}
      {rows.map((r, i) => (
        <GlassCard key={i} style={{ gap: 8 }}>
          <MadinahAyah surah={surah} ayah={i + 1} size={20} />
          <InnerCard style={{ gap: 6 }}>{r?.text ? <Passage text={r.text} /> : <Caption>لا يوجد في هذا التفسير نص لهذه الآية.</Caption>}</InnerCard>
        </GlassCard>
      ))}
      {count < meta.ayat ? (
        <Pressable accessibilityRole="button" onPress={() => setCount((c) => c + STEP)}>
          <Body size={14} weight="bold" color={colors.primary} style={{ textAlign: 'center', paddingVertical: 8 }}>
            {`الآيات التالية (${ar(Math.min(STEP, meta.ayat - count))})`}
          </Body>
        </Pressable>
      ) : null}
    </>
  );
}

/** A passage: six lines, then the whole on request (very long passages stay scrollable). */
function Passage({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      {open && text.length > 20000 ? (
        <ScrollView style={{ maxHeight: 520 }} nestedScrollEnabled>
          <TafsirText text={text} />
        </ScrollView>
      ) : (
        <TafsirText text={text} numberOfLines={open ? undefined : 6} />
      )}
      {text.length > 400 ? (
        <Pressable accessibilityRole="button" onPress={() => setOpen((v) => !v)}>
          <Body size={12} weight="bold" color={colors.primary}>
            {open ? 'عرض أقل' : 'اقرأ كاملًا'}
          </Body>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  item: { gap: 12, paddingVertical: 12 },
  sep: { borderTopWidth: 1, borderTopColor: colors.hairline },
  num: { width: 34, height: 34, borderRadius: 12, backgroundColor: 'rgba(3,90,95,0.08)', alignItems: 'center', justifyContent: 'center' },
  field: { height: 52, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  input: { flex: 1, minWidth: 0, fontSize: 15, color: colors.ink, textAlign: 'right', paddingVertical: 0, outlineWidth: 0 },
});
