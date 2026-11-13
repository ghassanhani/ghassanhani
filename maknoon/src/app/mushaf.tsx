import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { ReduceMotion, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Backdrop } from '@/components/Backdrop';
import { Icon } from '@/components/Icon';
import { Squircle } from '@/components/Squircle';
import { AyahText, Body, Caption, Display } from '@/components/Typography';
import { RoundButton } from '@/components/ui';
import { mushaf as m } from '@/content/design';
import { ar, ayahPlaceholder, ayatLabel, ayatOnPage, getAyah } from '@/content/quran';
import { stripTashkeel } from '@/content/text';
import { ayahKey, pageOfAyah, qcf4Available, qcf4Em, qcf4Page, useQcf4Fonts } from '@/content/qcf4';
import { recitationCredit, togglePage, usePlayer } from '@/recitation/player';
import { AyahMarker } from '@/components/AyahMarker';
import { PAGE_FRAME_XML } from '@/components/ayahMarker';
import { SvgXml } from 'react-native-svg';
import { F } from '@/theme/fonts';
import { colors } from '@/theme/tokens';
import { quranIndex } from '@/content/worship';
import { Breathe, haptic, isRTL, PressScale, Ripple, fadeIn, fadeOut } from '@/components/motion';
import { type TasmeeNote, useTasmee } from '@/recitation/useTasmee';
import { usePrefs } from '@/store/prefs';

/**
 * Mushaf reading (page ٥٠, آل عمران ١–٩ in the design).
 * On iOS/Android with the QCF4 fonts imported, each page is the Madinah Mushaf (1441) page itself:
 * 15 lines, line for line and glyph for glyph (founder decision 2026-11-13; see src/content/qcf4.ts).
 * Otherwise (web, or before the import) the verified Unicode text is reflowed.
 * Tap the page to show the reading controls.
 *
 * Recitation check (تسميع, experimental): the microphone button hides the page's words;
 * each word appears when the on-device model hears it. «؟» reveals the next word, and
 * the clear button hides everything again. The text itself is never changed — hidden
 * words keep their place, so the ayah marks stay where the mushaf has them.
 */
const LAST_PAGE = 604;
const DEFAULT_PAGE = 50; // the page the design shows

export default function MushafScreen() {
  const params = useLocalSearchParams<{ page?: string }>();
  const page = Math.min(LAST_PAGE, Math.max(1, Number(params.page) || DEFAULT_PAGE));
  // Keyed by page: turning the page starts a fresh recitation check.
  return <MushafPage key={page} page={page} />;
}

const isWord = (t: string) => /[\u0621-\u064A]/.test(t);

function MushafPage({ page }: { page: number }) {
  const insets = useSafeAreaInsets();
  const [controls, setControls] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [picking, setPicking] = useState(false);
  const [prefs] = usePrefs();
  const size = (prefs.quranSize - 3) * (zoom / 100); // Settings size 24 → the design's 21pt page

  // A page of the Madinah mushaf from the page data. Without ?page= it is the design's page ٥٠ (آل عمران ١–٩).
  const onPage = useMemo(() => ayatOnPage(page), [page]);
  const qcf = qcf4Available();
  const qcfReady = useQcf4Fonts(page);
  // The Madinah page can begin or end mid-ayah: the recitation check covers every ayah it shows.
  const keys = useMemo(
    () =>
      qcf
        ? [...new Set(qcf4Page(page).l.flatMap((l) => ('a' in l ? l.a.filter(Boolean).map(ayahKey) : [])))]
        : onPage.map((x) => `${x.surah}:${x.ayah}`),
    [qcf, page, onPage],
  );
  const tasmee = useTasmee(keys);
  // One block per surah on the page (the last juz has several surahs on one page).
  const blocks: { surah: number; starts: boolean; ayat: { key: string; text: string }[]; fontFamily?: string }[] = [];
  for (const x of onPage) {
    const t = getAyah(x.surah, x.ayah);
    const name = quranIndex.surahs[x.surah - 1]?.name ?? '';
    let b = blocks[blocks.length - 1];
    if (!b || b.surah !== x.surah) blocks.push((b = { surah: x.surah, starts: x.ayah === 1, ayat: [], fontFamily: t?.fontFamily }));
    b.ayat.push({ key: `${x.surah}:${x.ayah}`, text: t?.text ?? ayahPlaceholder(name, x.ayah) });
  }
  const goTo = (p: number) => router.setParams({ page: String(Math.min(LAST_PAGE, Math.max(1, p))) });

  // Listening from this page: the recitation follows the mushaf, turning the page when it moves on.
  const audio = usePlayer();
  const listening = audio.playing === 'page';
  const firstKey = keys[0] ?? '1:1';
  const nowPage = listening && audio.ayah ? (qcf ? pageOfAyah(audio.ayah) : null) : null;
  useEffect(() => {
    if (nowPage && nowPage !== page) router.setParams({ page: String(nowPage) });
  }, [nowPage, page]);
  const listen = () => {
    const [su, ay] = firstKey.split(':').map(Number);
    togglePage(su, ay);
  };

  return (
    <View style={{ flex: 1 }}>
      <Backdrop name="sand" />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 24, paddingBottom: insets.bottom + 150 }}>
        <Pressable accessibilityLabel="إظهار أدوات القراءة" onPress={() => setControls((v) => !v)}>
          {qcf ? (
            qcfReady ? <QcfPageView page={page} tasmee={tasmee} current={listening ? audio.ayah : null} onPickSurah={() => setPicking(true)} /> : <View style={{ minHeight: 600 }} />
          ) : null}
          {qcf ? null : blocks.map((b, i) => (
            <View key={b.surah} style={i > 0 ? { marginTop: 18 } : null}>
              {/* Surah banner: at the top of the page, and wherever a surah begins */}
              {i === 0 || b.starts ? (
                <SurahBanner surah={b.surah} onPress={() => setPicking(true)} />
              ) : null}
              {/* الفاتحة counts the basmala as its first ayah; التوبة has none */}
              {b.starts && b.surah !== 1 && b.surah !== 9 ? (
                <AyahText size={26} lineHeight={52} style={{ textAlign: 'center', marginTop: 10 }}>
                  {m.basmala}
                </AyahText>
              ) : null}
              <AyahText size={size} lineHeight={size * 1.95} style={[{ textAlign: 'justify', marginTop: 6 }, b.fontFamily ? { fontFamily: b.fontFamily } : null]}>
                {tasmee.active
                  ? b.ayat.map((a, ai) => {
                      // Same characters as the plain page, split into words so each can be hidden or marked.
                      const parts = a.text.split(/([\s\u00a0]+)/);
                      const shown = parts.filter(isWord).length;
                      let w = -1;
                      return (
                        <Text key={a.key}>
                          {ai ? ' ' : ''}
                          {parts.map((p, i) => {
                            if (!isWord(p)) return p; // spaces and ayah marks always show
                            w++;
                            const { state, current } = tasmee.wordState(a.key, w, shown);
                            return (
                              <Text key={i} style={current ? styles.wCurrent : state === 'pending' ? styles.wHidden : state === 'ok' ? null : styles.wCheck}>
                                {p}
                              </Text>
                            );
                          })}
                        </Text>
                      );
                    })
                  : b.ayat.map((a) => a.text).join(' ')}
              </AyahText>
            </View>
          ))}

          {/* Footer, as drawn: the page number in its ornamented frame at the centre, the hizb marker at the end */}
          <View style={styles.footer}>
            <View style={{ flex: 1 }} />
            <View style={styles.pageNo} accessibilityLabel={`صفحة ${ar(page)}`}>
              <SvgXml xml={PAGE_FRAME_XML} width={52.49} height={32.157} style={StyleSheet.absoluteFill} />
              {/* Thmanyah Serif Display Black, about 18pt, as in the design */}
              <Display size={18} lineHeight={22} color="#2E2F39">
                {ar(page)}
              </Display>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Body size={14} weight="medium" color={colors.primary}>
                {page === DEFAULT_PAGE ? m.marker : ''}
              </Body>
            </View>
          </View>
        </Pressable>
      </ScrollView>

      <SurahPicker
        visible={picking}
        current={onPage[0]?.surah ?? 1}
        onClose={() => setPicking(false)}
        onPick={(p) => {
          setPicking(false);
          goTo(p);
        }}
      />

      {!controls && listening && !tasmee.note ? (
        <View style={[styles.tasmee, { top: insets.top + 6 }]} pointerEvents="box-none">
          <PressScale accessibilityRole="button" accessibilityLabel="إيقاف التلاوة" onPress={listen} feedback="tap">
            <Squircle radius={22} fill="rgba(255,255,255,0.85)" glow="glass" style={styles.nowPlaying}>
              <Icon name="pause" size={18} color={colors.primary} />
              <Caption color={colors.primary}>{audio.reciter ? audio.reciter.name : ''}</Caption>
            </Squircle>
          </PressScale>
        </View>
      ) : null}

      {!controls && tasmee.note ? (
        <View style={[styles.tasmee, { top: insets.top + 6 }]} pointerEvents="box-none">
            <Squircle radius={16} fill="rgba(255,255,255,0.85)" glow="glass" style={styles.note}>
              <Caption style={{ textAlign: 'center' }}>{NOTES[tasmee.note]}</Caption>
              {tasmee.note === 'model-missing' ? (
                <Pressable accessibilityRole="link" onPress={() => router.push('/settings')}>
                  <Body size={12} weight="bold" color={colors.primary}>
                    الإعدادات
                  </Body>
                </Pressable>
              ) : null}
            </Squircle>
        </View>
      ) : null}

      {!controls ? (
        <View style={[styles.tasmee, { bottom: insets.bottom + 20 }]} pointerEvents="box-none">
          <View style={styles.tasmeeRow}>
            <Orb colors={['#B5514F', '#6E2424']} icon="clean" label="إخفاء الكل والبدء من جديد" onPress={tasmee.reset} />
            {tasmee.listening ? (
              <Orb colors={['#3C8C96', '#1F5C66']} icon="wave" label="إيقاف الاستماع" onPress={tasmee.stop} size={84} live />
            ) : (
              <Orb colors={['#4B6FB3', '#243F78']} icon="mic" label="ابدأ التسميع" onPress={tasmee.start} />
            )}
            <Orb colors={['#4F9A63', '#245C36']} icon="help" label="أظهر الكلمة التالية" onPress={tasmee.hint} />
          </View>
        </View>
      ) : null}

      {controls ? (
        <>
          <View style={[styles.controls, { bottom: insets.bottom + 24 }]} pointerEvents="box-none">
            <View style={styles.zoomRow}>
              <RoundButton icon="chevronRight" label="رجوع" onPress={() => (router.canGoBack() ? router.back() : router.replace('/quran'))} size={48} iconSize={22} />
              <ZoomButton icon="minus" label="تصغير" onPress={() => setZoom((z) => Math.max(70, z - 10))} />
              <Squircle radius={24} fill="rgba(255,255,255,0.75)" glow="glass" style={styles.zoomValue}>
                <Icon name="search" size={20} color={colors.ink} />
                <Body size={16} weight="bold" lineHeight={22}>
                  {ar(zoom)}
                </Body>
              </Squircle>
              <ZoomButton icon="plus" label="تكبير" onPress={() => setZoom((z) => Math.min(160, z + 10))} />
            </View>
            <View style={styles.zoomRow}>
              <RoundButton icon="chevronRight" label="الصفحة السابقة" onPress={() => goTo(page - 1)} size={48} iconSize={22} />
              <Squircle radius={24} fill="rgba(255,255,255,0.75)" glow="glass" style={styles.zoomValue}>
                <Body size={16} weight="bold" lineHeight={22}>{`صفحة ${ar(page)}`}</Body>
              </Squircle>
              <RoundButton icon="chevronLeft" label="الصفحة التالية" onPress={() => goTo(page + 1)} size={48} iconSize={22} />
            </View>
            <PressScale accessibilityRole="button" accessibilityLabel={listening ? 'إيقاف التلاوة' : 'استمع من هذه الصفحة'} onPress={listen} feedback="tap">
              <Squircle radius={24} fill="rgba(255,255,255,0.8)" glow="glass" style={styles.listen}>
                <Icon name={listening ? 'pause' : 'play'} size={20} color={colors.primary} />
                <Body size={15} weight="bold" color={colors.primary} lineHeight={20}>
                  {listening ? 'إيقاف التلاوة' : 'استمع من هذه الصفحة'}
                </Body>
              </Squircle>
            </PressScale>
            {listening && audio.reciter ? <Caption style={{ textAlign: 'center' }}>{recitationCredit(audio.reciter)}</Caption> : null}
            <Squircle radius={30} fill="rgba(255,255,255,0.8)" glow="glass" style={styles.search}>
              <Icon name="search" size={22} color={colors.primary} />
              <TextInput
                placeholder={m.searchPlaceholder}
                placeholderTextColor={colors.primary}
                style={[styles.searchInput, { fontFamily: F.display }]}
                accessibilityLabel={m.searchPlaceholder}
              />
            </Squircle>
          </View>
        </>
      ) : null}
    </View>
  );
}

/**
 * One Madinah Mushaf page from the QCF4 data: the surah banner from the design where the page
 * has a surah header, the basmala glyph, and 15 justified lines of glyphs. Glyph size is set so
 * the widest line of the whole mushaf fits the width, so every page has the same size, as in print.
 * In the recitation check a hidden word keeps its place (transparent), exactly like the text mode.
 */
function QcfPageView({ page, tasmee, current, onPickSurah }: { page: number; tasmee: ReturnType<typeof useTasmee>; current: string | null; onPickSurah: () => void }) {
  const { width } = useWindowDimensions();
  const pg = qcf4Page(page);
  const w = Math.min(width, 520) - 48;
  const size = w / qcf4Em.line;
  const lineH = size * 2.05;
  const centred = page <= 2; // the first two pages are set in a narrow block, centred
  const row = isRTL() ? 'row' : 'row-reverse';
  // Words counted per ayah the same way the recitation check counts them.
  const wordCount = (key: string) => {
    const [s, a] = key.split(':').map(Number);
    return (getAyah(s, a)?.text ?? '').split(/[\s\u00a0]+/).filter(isWord).length;
  };
  const firstIsHeader = 'h' in (pg.l[0] ?? {});
  const firstSurah = (() => {
    for (const l of pg.l) {
      if ('h' in l) return l.h;
      if ('a' in l) {
        const n = l.a.find(Boolean);
        if (n) return Number(ayahKey(n).split(':')[0]);
      }
    }
    return 1;
  })();
  return (
    <View>
      {/* The design keeps the banner at the top of every page (it opens the surah list) */}
      {firstIsHeader ? null : <SurahBanner surah={firstSurah} onPress={onPickSurah} />}
      {pg.l.map((l, li) => {
        if ('h' in l) {
          return (
            <View key={li} style={{ marginTop: li ? 10 : 0, marginBottom: 4 }}>
              <SurahBanner surah={l.h} onPress={onPickSurah} />
            </View>
          );
        }
        if ('b' in l) {
          return (
            <Text key={li} style={{ fontFamily: l.f, fontSize: size, lineHeight: lineH, color: colors.ink, textAlign: 'center' }}>
              {l.b}
            </Text>
          );
        }
        const glyphs = Array.from(l.g);
        return (
          <View key={li} style={{ flexDirection: row, justifyContent: centred ? 'center' : 'space-between', gap: centred ? size * 0.3 : 0, height: lineH, alignItems: 'center' }}>
            {glyphs.map((ch, gi) => {
              const ai = l.a[gi];
              const wi = l.i[gi];
              // The ayah end: the design's teal medallion with the ayah number, in place of the font's mark
              if (wi === -1 && ai) return <AyahMarker key={gi} n={Number(ayahKey(ai).split(':')[1])} scale={size / 21} />;
              let style = null;
              // the ayah being recited reads in teal
              if (current && ai && ayahKey(ai) === current) style = styles.wListen;
              if (tasmee.active && ai && wi >= 0) {
                const key = ayahKey(ai);
                const { state, current } = tasmee.wordState(key, wi, wordCount(key));
                style = current ? styles.wCurrent : state === 'pending' ? styles.wHidden : state === 'ok' ? null : styles.wCheck;
              }
              return (
                <Text key={gi} style={[{ fontFamily: pg.f, fontSize: size, lineHeight: lineH, color: colors.ink }, style]}>
                  {ch}
                </Text>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

// Calligraphic surah names drawn in the design. Others fall back to the display font until their artwork exists.
const TITLE_ART: Record<number, number> = {
  3: require('../../assets/brand/surah-titles/3.png'),
};

/**
 * The ornamented surah header from the design canvas (exported artwork, 354×61 with a soft edge).
 * Tapping it opens the surah picker.
 */
function SurahBanner({ surah, onPress }: { surah: number; onPress: () => void }) {
  const name = quranIndex.surahs[surah - 1]?.name ?? '';
  return (
    <PressScale accessibilityRole="button" accessibilityLabel={`سورة ${name} · تغيير السورة`} onPress={onPress} innerStyle={styles.banner} scaleTo={0.98} feedback="select">
      <Image source={require('../../assets/brand/surah-banner.png')} style={styles.bannerArt} contentFit="fill" />
      <View style={styles.bannerRow}>
        {TITLE_ART[surah] ? (
          <Image source={TITLE_ART[surah]} style={styles.bannerTitle} contentFit="contain" accessibilityLabel={`سورة ${name.replace(/[\u064B-\u0652\u0670]/g, '')}`} />
        ) : (
          // Free calligraphic fallback until each surah has its drawn title: Amiri Quran (SIL OFL).
          <Text style={styles.bannerName}>{`سورة ${name.replace(/[\u064B-\u0652\u0670]/g, '')}`}</Text>
        )}
        <View style={styles.bannerChevron}>
          <Icon name="chevronDown" size={14} color={colors.white} />
        </View>
      </View>
    </PressScale>
  );
}

/** Bottom sheet listing the 114 surahs; choosing one turns the mushaf to its first page. */
function SurahPicker({ visible, current, onClose, onPick }: { visible: boolean; current: number; onClose: () => void; onPick: (page: number) => void }) {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const needle = stripTashkeel(q.trim());
  const list = needle ? quranIndex.surahs.filter((x) => stripTashkeel(x.name).includes(needle) || String(x.n) === needle || ar(x.n) === needle) : quranIndex.surahs;
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View entering={fadeIn} exiting={fadeOut} style={styles.scrim}>
        <Pressable accessibilityLabel="إغلاق" onPress={onClose} style={{ flex: 1 }} />
      </Animated.View>
      <Animated.View entering={sheetIn} exiting={sheetOut} style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.sheetHead}>
          <Display size={20}>اختر السورة</Display>
          <RoundButton icon="close" label="إغلاق" size={36} iconSize={16} onPress={onClose} />
        </View>
        <View style={styles.sheetSearch}>
          <Icon name="search" size={18} color={colors.primary} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="اسم السورة أو رقمها"
            placeholderTextColor={colors.muted}
            accessibilityLabel="ابحث عن سورة"
            style={[styles.sheetInput, { fontFamily: F.sans }]}
          />
        </View>
        <FlatList
          data={list}
          keyExtractor={(x) => String(x.n)}
          initialScrollIndex={needle ? undefined : Math.max(0, current - 3)}
          getItemLayout={(_, i) => ({ length: 56, offset: 56 * i, index: i })}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item: x }) => (
            <Pressable accessibilityRole="button" accessibilityState={{ selected: x.n === current }} onPress={() => {
              haptic.select();
              onPick(x.page);
            }} style={[styles.sheetRow, x.n === current && { backgroundColor: 'rgba(3,90,95,0.08)' }]}>
              <View style={styles.sheetNo}>
                <Body size={13} weight="bold" color={colors.primary} lineHeight={18}>
                  {ar(x.n)}
                </Body>
              </View>
              <View style={{ flex: 1 }}>
                <Display size={17}>{x.name}</Display>
                <Caption>{`${x.type} · ${ayatLabel(x.ayat)}`}</Caption>
              </View>
              <Caption>{`ص ${ar(x.page)}`}</Caption>
            </Pressable>
          )}
          ListEmptyComponent={<Caption style={{ padding: 16, textAlign: 'center' }}>لا نتائج</Caption>}
        />
      </Animated.View>
    </Modal>
  );
}

// The sheet rises on a soft spring and drops away quickly.
const sheetIn = SlideInDown.springify().damping(24).stiffness(220).reduceMotion(ReduceMotion.System);
const sheetOut = SlideOutDown.duration(200).reduceMotion(ReduceMotion.System);

const NOTES: Record<Exclude<TasmeeNote, null>, string> = {
  'web-preview': 'معاينة آلية · نسخة الويب لا تستمع، والتسميع يعمل في تطبيق iOS وAndroid',
  'model-unavailable': 'نموذج التسميع لم يُنشر بعد',
  'model-missing': 'يحتاج التسميع إلى تنزيل نموذج الاستماع مرة واحدة ·',
  'mic-failed': 'تعذّر تشغيل الميكروفون. تحقق من إذنه في إعدادات الجهاز.',
};

/** Round glossy button of the recitation check. */
function Orb({ colors: c, icon, label, onPress, size = 68, live = false }: { colors: [string, string]; icon: 'clean' | 'mic' | 'help' | 'wave'; label: string; onPress: () => void; size?: number; live?: boolean }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      {/* While listening, soft rings spread from the button: the app is hearing you. */}
      <Ripple size={size} color={c[0]} active={live} />
      <PressScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} scaleTo={0.9} feedback={icon === 'mic' || icon === 'wave' ? 'soft' : 'select'}>
        <Breathe active={live} scale={1.04}>
          <LinearGradient colors={c} start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }} style={[styles.orb, { width: size, height: size, borderRadius: size / 2 }]}>
            <Icon name={icon} size={size * 0.44} color="#FFFFFF" />
          </LinearGradient>
        </Breathe>
      </PressScale>
    </View>
  );
}

function ZoomButton({ icon, label, onPress }: { icon: 'plus' | 'minus'; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}>
      <Squircle radius={24} fill="rgba(255,255,255,0.75)" glow="glass" style={styles.zoomBtn}>
        <Icon name={icon} size={20} color={colors.ink} />
      </Squircle>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: { height: 61, alignItems: 'center', justifyContent: 'center' },
  // The exported artwork carries a 4pt soft edge at the sides, 6pt above and 9pt below the 354×61 banner.
  bannerArt: { position: 'absolute', left: -4, right: -4, top: -6, bottom: -9 },
  bannerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bannerTitle: { width: 122, height: 44 },
  bannerName: { fontFamily: F.display, fontSize: 24, lineHeight: 40, color: colors.white, textAlign: 'center' },
  bannerChevron: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.28)', alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 },
  pageNo: { width: 52.49, height: 32.157, alignItems: 'center', justifyContent: 'center' },
  scrim: { flex: 1, backgroundColor: 'rgba(20,24,40,0.35)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '72%', backgroundColor: '#F7F4F1', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 14 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 10 },
  sheetSearch: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, marginHorizontal: 20, marginBottom: 8, paddingHorizontal: 14, borderRadius: 22, backgroundColor: '#FFFFFF' },
  sheetInput: { flex: 1, minWidth: 0, fontSize: 15, color: colors.ink, textAlign: 'right', paddingVertical: 0 },
  sheetRow: { height: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20 },
  sheetNo: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(3,90,95,0.08)', alignItems: 'center', justifyContent: 'center' },
  tasmee: { position: 'absolute', start: 20, end: 20, alignItems: 'center', gap: 10 },
  tasmeeRow: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14 },
  orb: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.65)', boxShadow: '0 6px 14px rgba(0,0,0,0.22)' },
  // Word states of the recitation check. Hidden words keep their width so the line layout does not move.
  wHidden: { color: 'transparent' },
  wListen: { color: colors.primary },
  nowPlaying: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 },
  listen: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  wCurrent: { color: '#1F7A33', backgroundColor: '#CDE9C3' },
  wCheck: { color: '#A8862B' },
  controls: { position: 'absolute', start: 20, end: 20, gap: 14, alignItems: 'center' },
  zoomRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  zoomBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  zoomValue: { height: 48, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 22 },
  search: { alignSelf: 'stretch', height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20 },
  searchInput: { flex: 1, minWidth: 0, fontSize: 15, color: colors.primary, textAlign: 'center' },
});
