import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { fadeIn, haptic, isRTL, motion } from '@/components/motion';
import { Pressable, StyleSheet, View } from 'react-native';
import { DetailHeader } from '@/components/DetailHeader';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Squircle } from '@/components/Squircle';
import { TafsirText } from '@/components/TafsirText';
import { AyahText, Body, Caption, Display } from '@/components/Typography';
import { CountBadge, GlassCard, HeroCard, InnerCard, ReviewedChip, Segmented, SuggestedChip } from '@/components/ui';
import { ayahToday, home } from '@/content/design';
import { ar, ayahPlaceholder, getAyah, quranSource } from '@/content/quran';
import { packsSupported } from '@/content/packs';
import { useTafsir, type TafsirEntry } from '@/content/tafsir';
import { LANGS, type Lang, translationOf } from '@/content/translation';
import { recitationCredit, toggleAyah, usePlayer } from '@/recitation/player';
import { quranIndex } from '@/content/worship';
import { colors } from '@/theme/tokens';

/** Ayah detail ("آية اليوم"): canonical text on top, link drawers below. */
export default function AyahScreen() {
  const { id = '3:3' } = useLocalSearchParams<{ id: string }>();
  const [s, a] = id.split(':').map(Number);
  const meta = home.ayahOfDay; // the design defines آل عمران ٣
  const isDesignAyah = s === meta.surah && a === meta.ayah;
  const ayah = getAyah(s, a);
  const all = useTafsir(s, a);
  const tafsir = (all ?? []).filter((t) => t.text);
  const missing = (all ?? []).filter((t) => !t.installed);
  const [lang, setLang] = useState<Lang>('en');
  const tr = translationOf(s, a, lang);
  const audio = usePlayer();
  const here = audio.playing === `${s}:${a}`;

  return (
    <Screen backdrop="sky" withTabBar={false} header={<DetailHeader title={ayahToday.title} />}>
      <HeroCard hero="ocean" style={{ minHeight: 210 }}>
        <View style={styles.between}>
          <Display size={22} color={colors.white}>
            {ayahToday.title}
          </Display>
          <View style={[styles.row, { gap: 8 }]}>
            <GlassIcon name="translation" label="الترجمة" />
            <GlassIcon name={here ? 'pause' : 'play'} label={here ? 'إيقاف التلاوة' : 'استماع'} onPress={() => toggleAyah(s, a)} />
          </View>
        </View>
        <AyahText size={23} lineHeight={46} color={colors.white} style={[{ marginTop: 8 }, ayah && { fontFamily: ayah.fontFamily }]}>
          {ayah ? ayah.text : ayahPlaceholder(isDesignAyah ? meta.surahName : (quranIndex.surahs[s - 1]?.name ?? String(s)), a)}
        </AyahText>
        <Caption color="rgba(255,255,255,0.8)">{isDesignAyah ? meta.ref : `${quranIndex.surahs[s - 1]?.name ?? ar(s)} : ${ar(a)}`}</Caption>
        <Caption color="rgba(255,255,255,0.55)" style={{ fontSize: 10 }}>
          {quranSource.credit}
        </Caption>
        {here && audio.reciter ? (
          <Caption color="rgba(255,255,255,0.7)" style={{ fontSize: 10 }}>
            {recitationCredit(audio.reciter)}
          </Caption>
        ) : null}
      </HeroCard>

      <Drawer title={ayahToday.tafsirTitle} count={tafsir.length ? String(tafsir.length) : undefined}>
        {tafsir.length ? (
          tafsir.map((t) => <TafsirCard key={t.key} entry={t as TafsirEntry & { text: string }} />)
        ) : all === null ? (
          <Caption>…</Caption>
        ) : (
          <InnerCard>
            <Body size={14} color={colors.primary}>
              {ayahToday.tafsirPlaceholder}
            </Body>
          </InnerCard>
        )}
      {packsSupported && missing.length ? (
          <Pressable accessibilityRole="link" onPress={() => router.push('/settings')}>
            <Squircle radius={30} fill="rgba(247,241,241,0.61)" stroke="#FFFFFF" glow="glass" style={styles.more}>
              <Body size={13} weight="medium" color={colors.primary}>
                {`نزّل ${missing.map((m) => m.title).join('، ')} من حزم التفسير`}
              </Body>
            </Squircle>
          </Pressable>
        ) : null}
      </Drawer>

      {tr ? (
        <Drawer title="ترجمة المعاني">
          <Segmented options={LANGS.map((l) => ({ value: l.key, label: l.label }))} value={lang} onChange={setLang} />
          <InnerCard>
            {/* French reads left to right */}
            <Body size={15} lineHeight={24} style={styles.ltr}>
              {tr.text}
            </Body>
            {tr.note ? (
              <Body size={12} lineHeight={19} color={colors.muted} style={[styles.ltr, { marginTop: 8 }]}>
                {tr.note}
              </Body>
            ) : null}
            <Caption style={{ marginTop: 8 }}>{tr.credit}</Caption>
          </InnerCard>
        </Drawer>
      ) : null}

      <Drawer title={ayahToday.hadithTitle}>
        <Caption>لا توجد بعد روابط أحاديث مُراجَعة لهذه الآية.</Caption>
      </Drawer>
    </Screen>
  );
}

const PAGE = 4000; // first page; later pages grow (×2, capped at 16k) so ~10 taps read even the longest entry
const CHUNK = 3500; // render as several medium text blocks, not one huge one

/** Cut index at a paragraph (or sentence/space) boundary near n, never mid-word. */
function cutAt(text: string, n: number) {
  if (n >= text.length) return text.length;
  for (const sep of ['\n', '. ', '، ', ' ']) {
    const i = text.lastIndexOf(sep, n);
    if (i > n * 0.6) return i + sep.length;
  }
  return n;
}

/** [start, end) ranges of ~CHUNK characters, split at boundaries, covering text[0, end). */
function chunks(text: string, end: number): [number, number][] {
  const out: [number, number][] = [];
  let a = 0;
  while (a < end) {
    const b = Math.min(end, cutAt(text, a + CHUNK) > a ? cutAt(text, a + CHUNK) : a + CHUNK);
    out.push([a, b]);
    a = b;
  }
  return out;
}

/**
 * One tafsir entry. Some entries are huge (Ibn Kathir on الفاتحة ١ ≈ 131k characters),
 * so the text is revealed page by page; it is never edited (CC BY-ND), only paginated.
 */
function TafsirCard({ entry }: { entry: TafsirEntry & { text: string } }) {
  const [shown, setShown] = useState(0); // 0 = collapsed preview
  const total = entry.text.length;
  const end = shown ? cutAt(entry.text, shown) : cutAt(entry.text, 600);
  const remaining = total - end;
  return (
    <InnerCard style={{ gap: 6 }}>
      <View style={[styles.row, { gap: 8, flexWrap: 'wrap' }]}>
        <Display size={15}>{entry.title}</Display>
        {/* Status = the publisher's own editorial stage in the Itqan file. */}
        {entry.stage === 'approved' ? <ReviewedChip /> : entry.stage === 'in-review' ? <SuggestedChip /> : null}
      </View>
      {shown ? (
        chunks(entry.text, end).map(([a, b]) => <TafsirText key={a} text={entry.text.slice(a, b)} />)
      ) : (
        <TafsirText text={entry.text.slice(0, end)} numberOfLines={5} />
      )}
      <View style={[styles.row, { gap: 16 }]}>
        {remaining > 0 ? (
          <Pressable accessibilityRole="button" onPress={() => setShown((v) => (v ? v + Math.min(Math.max(v, PAGE), 16000) : PAGE))}>
            <Body size={12} weight="bold" color={colors.primary}>
              {shown ? `اقرأ المزيد · بقي ${ar(Math.ceil((remaining / total) * 100))}٪` : 'اقرأ كاملًا'}
            </Body>
          </Pressable>
        ) : null}
        {shown ? (
          <Pressable accessibilityRole="button" onPress={() => setShown(0)}>
            <Body size={12} weight="bold" color={colors.muted}>
              عرض أقل
            </Body>
          </Pressable>
        ) : null}
      </View>
      {shown && remaining <= 0 && entry.footnote ? <Caption>{entry.footnote}</Caption> : null}
      <Caption>{`يشرح${entry.edition ? ` · ${entry.edition}` : ''} · ${entry.attribution}`}</Caption>
    </InnerCard>
  );
}

function GlassIcon({ name, label, onPress }: { name: 'play' | 'pause' | 'translation'; label: string; onPress?: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6}>
      <View style={styles.glassIcon}>
        <Icon name={name} size={16} color={colors.white} />
      </View>
    </Pressable>
  );
}

/** A collapsible group of typed links (التفسير، الأحاديث …). */
function Drawer({ title, count, children }: { title: string; count?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <GlassCard style={{ gap: 12 }}>
      <View style={[styles.between, { alignItems: 'center' }]}>
        <View style={[styles.row, { gap: 8 }]}>
          <Display size={22}>{title}</Display>
          {count ? <CountBadge value={count} /> : null}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={open ? 'طيّ' : 'توسيع'} onPress={() => {
            haptic.select();
            setOpen((v) => !v);
          }} style={styles.ring}>
          <Chevron open={open} />
        </Pressable>
      </View>
      {open ? <Animated.View entering={fadeIn} style={{ gap: 12 }}>{children}</Animated.View> : null}
    </GlassCard>
  );
}

/** The drawer chevron turns smoothly between open and closed. */
function Chevron({ open }: { open: boolean }) {
  const r = useSharedValue(open ? 0 : 1);
  useEffect(() => {
    r.set(withSpring(open ? 0 : 1, motion.settleSpring));
  }, [open, r]);
  const dir = isRTL() ? 1 : -1; // closed points toward the reading direction's start
  const anim = useAnimatedStyle(() => ({ transform: [{ rotate: `${dir * 90 * r.value}deg` }] }));
  return (
    <Animated.View style={anim}>
      <Icon name="chevronDown" size={17} color={colors.ink} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  ltr: { writingDirection: 'ltr', textAlign: 'left', fontFamily: undefined },
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  // teal glass bubble, as on the canvas: a plain native shape, cheap to draw
  glassIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.35), inset 0 -2px 4px rgba(0,0,0,0.2), 0 4px 10px rgba(0,30,40,0.25)',
  },
  more: { minHeight: 46, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  ring: { width: 37, height: 37, borderRadius: 18.5, borderWidth: 1, borderColor: colors.ring, alignItems: 'center', justifyContent: 'center' },
});
