import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import Animated, { Easing, runOnJS, useAnimatedKeyboard, useAnimatedStyle, useDerivedValue, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { ThiqalIcon } from '@/components/ThiqalIcon';
import { PageCurl } from '@/components/PageCurl';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type ShotTarget, pageShot, shotsSupported, takePageShot } from '@/content/pageShots';
import { Image as RNImage, Keyboard, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Pressable } from '@/components/Tap';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Backdrop } from '@/components/Backdrop';
import { Icon, type IconName } from '@/components/Icon';
import { Squircle } from '@/components/Squircle';
import { AyahText, Body, Caption, Display } from '@/components/Typography';
import { mushaf as m } from '@/content/design';
import { ar, ayahPlaceholder, ayatOnPage, basmala, getAyah } from '@/content/quran';
import { SURAH_TITLES } from '@/content/surahTitles';
import { ayahKey, pageOfAyah, type Qcf4Line, qcf4Available, qcf4Page, useQcf4Fonts } from '@/content/qcf4';
import { MadinahAyah } from '@/components/MadinahAyah';
import { Timeline } from '@/components/Timeline';
import { searchQuran } from '@/search/engine';
import { recitationCredit, stop as stopAudio, togglePage, usePlayer } from '@/recitation/player';
import { AyahMarker } from '@/components/AyahMarker';
import { F } from '@/theme/fonts';
import { colors } from '@/theme/tokens';
import { quranIndex } from '@/content/worship';
import { Breathe, haptic, isRTL, PressScale, Ripple, fadeIn, fadeOut } from '@/components/motion';
import { type TasmeeNote, useTasmee } from '@/recitation/useTasmee';
import { getPrefs, setPrefs, usePrefs } from '@/store/prefs';
import { juzNameVoweled, readingAt } from '@/store/reading';

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
/** The physical page turn: swipe to curl the page over like paper, with the page-turn sound. */
const PAGE_FLIP = true;

// The page-turn sound: one take generated with ElevenLabs (sound effects) and trimmed to the turn.
let turnSound: AudioPlayer | null = null;
/** Loaded when the Mushaf opens, so the turn plays the instant the page is let go. */
function loadTurn() {
  try {
    turnSound ??= createAudioPlayer(require('../../assets/sounds/page-turn.mp3'));
  } catch {
    // sound is a nicety; the page still turns
  }
}
function playTurn() {
  loadTurn();
  if (!turnSound) return;
  turnSound.seekTo(0).catch(() => undefined);
  turnSound.play();
}

export default function MushafScreen() {
  const params = useLocalSearchParams<{ page?: string }>();
  // Without ?page= the mushaf opens where the reader left off (page ١ the first time).
  const page = Math.min(LAST_PAGE, Math.max(1, Number(params.page) || getPrefs().lastPage || 1));
  // Keyed by page: turning the page starts a fresh recitation check.
  return <MushafPage key={page} page={page} />;
}

const PAGE_MARGIN = 10; // the side margin of the mushaf page (pt)
const PAPER_TICK = 0.08; // a haptic tick for every 8% of the width the page is drawn
const QURAN_INK = '#111114'; // the printed page's deep black: sharper than the app's body ink
// Dark mode, for the mushaf only: a deep warm black page and soft warm-white ink (not pure white,
// which glares at night).
const DARK = { page: '#111214', ink: '#E9E4D8', number: '#E9E4D8', paper: '#1C1D21' };
/** The page's background: the design's sand, or the dark page. */
function PageBg({ dark }: { dark: boolean }) {
  return dark ? <View style={[StyleSheet.absoluteFill, { backgroundColor: DARK.page }]} /> : <Backdrop name="sand" />;
}
// The widest line of each page in its font, in em (measured from the fonts, see the json):
// each page's glyphs are drawn as large as its widest line allows.
const LINE_EM: number[] = (require('../../assets/content/qcf4-line-em.json') as { em: number[] }).em;
const lineEm = (page: number) => Math.min(17.6, Math.max(16, (LINE_EM[page - 1] ?? 17.4) + 0.15));
const isWord = (t: string) => /[\u0621-\u064A]/.test(t);
// Words per ayah, counted the same way the recitation check counts them (cached: asked for every glyph).
const WORDS = new Map<string, number>();
function ayahWords(key: string) {
  let n = WORDS.get(key);
  if (n === undefined) {
    const [s, a] = key.split(':').map(Number);
    n = (getAyah(s, a)?.text ?? '').split(/[\s\u00a0]+/).filter(isWord).length;
    WORDS.set(key, n);
  }
  return n;
}

function MushafPage({ page }: { page: number }) {
  const insets = useSafeAreaInsets();
  const [controls, setControls] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [prefs] = usePrefs();
  const dark = prefs.quranDark;
  // the Madinah page line for line, or the flowing text (switched from the recitation bar)
  const view = prefs.mushafView;
  // A long press on an ayah marks it and opens its actions (listen, translation, tafsir, bookmark,
  // copy, share) as a system sheet; the mark clears when the sheet closes.
  const [held, setHeld] = useState<string | null>(null);
  // Highlighter: while it is on, tapping an ayah highlights it (or clears it); saved on the device.
  const [marking, setMarking] = useState(false);
  const toggleControls = useCallback(() => setControls((v) => !v), []);
  const onTapWord = useCallback((key?: string) => {
    if (marking && key) {
      haptic.select();
      setPrefs((p) => ({ highlights: p.highlights.includes(key) ? p.highlights.filter((k) => k !== key) : [...p.highlights, key] }));
    } else setControls((v) => !v);
  }, [marking]);
  const onHold = useCallback((key: string) => {
    haptic.select();
    setHeld(key);
    router.push({ pathname: '/ayah-actions', params: { key } });
  }, []);
  useFocusEffect(useCallback(() => setHeld(null), []));
  // The reading position: the page on screen is remembered (on the device only).
  useEffect(() => {
    if (getPrefs().lastPage !== page) setPrefs({ lastPage: page });
  }, [page]);
  const size = (prefs.quranSize - 3) * (zoom / 100); // Settings size 24 → the design's 21pt page

  // A page of the Madinah mushaf from the page data. Without ?page= it is the design's page ٥٠ (آل عمران ١–٩).
  const onPage = useMemo(() => ayatOnPage(page), [page]);
  const qcf = qcf4Available();
  const pageView = qcf && view === 'page';
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
  // a red word tapped during the recitation check: what the listening model heard there
  const [heardNote, setHeardNote] = useState<string | null>(null);
  const onFlag = useCallback(
    (key: string, word: number) => {
      const h = tasmee.heardAt(key, word, ayahWords(key));
      if (h === null) return;
      haptic.select();
      setHeardNote(h ? `سُمِعَت: ${h}` : 'لم تُسمَع هذه الكلمة');
      setTimeout(() => setHeardNote(null), 3500);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasmee.heardAt],
  );
  // One block per surah on the page (the last juz has several surahs on one page).
  const blocks: { surah: number; starts: boolean; ayat: { key: string; text: string }[]; fontFamily?: string }[] = [];
  for (const x of onPage) {
    const t = getAyah(x.surah, x.ayah);
    const name = quranIndex.surahs[x.surah - 1]?.name ?? '';
    let b = blocks[blocks.length - 1];
    if (!b || b.surah !== x.surah) blocks.push((b = { surah: x.surah, starts: x.ayah === 1, ayat: [], fontFamily: t?.fontFamily }));
    b.ayat.push({ key: `${x.surah}:${x.ayah}`, text: t?.text ?? ayahPlaceholder(name, x.ayah) });
  }
  // the surah list opens as the system sheet (native slide, drag down to close)
  const pickSurah = () => router.push({ pathname: '/surah-picker', params: { current: String(onPage[0]?.surah ?? 1) } });
  const goTo = (p: number) => router.setParams({ page: String(Math.min(LAST_PAGE, Math.max(1, p))) });
  // Search in the Mushaf: results above the field; a result opens its ayah's page.
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<{ key: string; surah: number; ayah: number }[] | null>(null);
  // a surah named in the query («الفاتحة», «سورة الكهف», «18») comes first, opening at its first page
  const [surahHit, setSurahHit] = useState<number | null>(null);
  const runSearch = () => {
    const t = query.trim();
    if (!t) return setFound(null);
    const n = plainSearch(t.replace(/^سوره\s+/, '').replace(/^سورة\s+/, ''));
    const hit = quranIndex.surahs.find((x) => String(x.n) === n || plainSearch(x.name) === n || plainSearch(x.name) === `ال${n}`);
    setSurahHit(hit?.n ?? null);
    setFound(searchQuran(t, 8));
  };
  const openFound = (key: string) => {
    const p = pageOfAyah(key);
    setFound(null);
    setQuery('');
    Keyboard.dismiss();
    if (p) goTo(p);
  };
  // the bottom controls ride above the keyboard
  const kb = useAnimatedKeyboard();
  const lift = useAnimatedStyle(() => ({ transform: [{ translateY: -Math.max(0, kb.height.value - insets.bottom - 8) }] }));

  // Listening from this page: the recitation follows the mushaf, turning the page when it moves on.
  const audio = usePlayer();
  // leaving the Mushaf ends the recitation started in it
  useEffect(() => () => stopAudio(), []);
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

  // ── Turning the page like paper, the Arabic way: swiping right → left lifts the page by its right edge
  // and turns it to the left, showing the next page beneath; swiping left → right brings the previous
  // page back. Vertical scrolling and taps are left alone.
  const { width: winW } = useWindowDimensions();
  const flip = useSharedValue(0); // 0 rest · (0, 1] turning to the next page · [-1, 0) bringing back the previous
  const { height: winH } = useWindowDimensions();
  // The curl is drawn from still images of the pages (cheap), taken once in the background after the
  // page settles: this page, then the next and previous ones, rendered off screen just long enough to shoot.
  const pageRef = useRef<ShotTarget>(null);
  const nextRef = useRef<ShotTarget>(null);
  const prevRef = useRef<ShotTarget>(null);
  const [shots, setShots] = useState(0); // bumps when a shot lands
  const needNext = shotsSupported && page < LAST_PAGE && !pageShot(page + 1);
  const needPrev = shotsSupported && page > 1 && !pageShot(page - 1);
  const [shootNeighbours, setShootNeighbours] = useState(false);
  useEffect(() => {
    if (!PAGE_FLIP || !shotsSupported || !qcfReady) return;
    let live = true;
    const t = setTimeout(async () => {
      try {
        if (pageRef.current && !pageShot(page)) await takePageShot(page, pageRef.current);
        if (live) setShots((n) => n + 1);
        if (live && (needNext || needPrev)) setShootNeighbours(true);
      } catch {
        // no shot: the page simply won't curl until one is taken
      }
    }, 450);
    return () => {
      live = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qcfReady, page]);
  const onNeighbourReady = async () => {
    await new Promise((r) => setTimeout(r, 250)); // the page's glyphs are laid out
    try {
      if (nextRef.current && needNext) await takePageShot(page + 1, nextRef.current);
      if (prevRef.current && needPrev) await takePageShot(page - 1, prevRef.current);
    } catch {
      // try again on the next visit
    }
    setShootNeighbours(false);
    setShots((n) => n + 1);
  };
  const curImg = shotsSupported ? pageShot(page) : null;
  const nextImg = shotsSupported ? pageShot(page + 1) : null;
  const prevImg = shotsSupported ? pageShot(page - 1) : null;
  void shots;
  // The still images only make the turn lighter: a page without one turns all the same, drawn live
  // (a shot that failed, or not taken yet, must never lock the page in place).
  const canCurlNext = true;
  const canCurlPrev = true;
  const shotView = (uri: string) => <RNImage source={{ uri }} style={{ width: winW, height: winH }} />;
  useQcf4Fonts(Math.min(LAST_PAGE, page + 1)); // the neighbours' fonts are ready before a turn
  useQcf4Fonts(Math.max(1, page - 1));
  useEffect(loadTurn, []);
  const turned = (d: number) => {
    haptic.land();
    goTo(page + d);
  };
  const canNext = page < LAST_PAGE && canCurlNext;
  const canPrev = page > 1 && canCurlPrev;
  // Touch: the paper is felt in the hand. A soft bump when the finger takes the page, a fine tick
  // every so often as it is drawn across (like paper fibres under the finger), a firm tap when it
  // lands, a soft one when it falls back.
  const step = useSharedValue(0);
  const pan = Gesture.Pan()
    .enabled(PAGE_FLIP)
    .activeOffsetX([-16, 16])
    .failOffsetY([-14, 14])
    .onStart(() => {
      step.set(0);
      runOnJS(haptic.soft)();
    })
    .onUpdate((e) => {
      // As a printed mushaf: drawn left → right for the next page (the page lifts from its left edge
      // and turns over to the right about the binding), right → left to bring the previous one back
      let v = e.translationX / winW;
      if ((v > 0 && !canNext) || (v < 0 && !canPrev)) v *= 0.08; // first or last page: a little give, no turn
      flip.set(Math.max(-1, Math.min(1, v)));
      const k = Math.floor(Math.abs(v) / PAPER_TICK);
      if (k !== step.get()) {
        step.set(k);
        runOnJS(haptic.select)();
      }
    })
    .onEnd((e) => {
      const v = flip.get();
      const d = v > 0 ? 1 : -1;
      const allowed = d === 1 ? canNext : canPrev;
      const vx = e.velocityX;
      const fling = Math.abs(vx) > 650 && Math.sign(vx) === d;
      if (allowed && (Math.abs(v) > 0.3 || fling) && Math.sign(vx || v) !== -d) {
        runOnJS(playTurn)();
        // the rest of the turn takes time in proportion to what is left, quicker for a flick, easing out like paper settling
        const left = 1 - Math.abs(v);
        const duration = Math.max(160, Math.min(520, (fling ? 300 : 460) * left + 90));
        flip.set(withTiming(d, { duration, easing: Easing.out(Easing.cubic) }, (done) => done && runOnJS(turned)(d)));
      } else {
        runOnJS(haptic.soft)();
        flip.set(withSpring(0, { damping: 19, stiffness: 210, mass: 0.9 }));
      }
    });
  // The curl: turning forward, the current page curls away over the next one; turning back, the
  // previous page curls back down over the current one. Each shows only during its own turn.
  const forward = useDerivedValue(() => Math.max(0, flip.get()));
  const backward = useDerivedValue(() => 1 + Math.min(0, flip.get()));
  const showForward = useDerivedValue<number>(() => (flip.get() > 0.0005 ? 1 : 0));
  const showBackward = useDerivedValue<number>(() => (flip.get() < -0.0005 ? 1 : 0));

  return (
    <View style={{ flex: 1 }}>
      <PageBg dark={dark} />
      {/* the neighbouring pages, off screen, only while their still images are taken */}
      {shootNeighbours ? (
        <View style={styles.offscreen} pointerEvents="none">
          {needNext ? (
            <View ref={nextRef} collapsable={false} style={{ width: winW, height: winH }} onLayout={onNeighbourReady}>
              <PageSheet page={page + 1} dark={dark} text={!pageView} />
            </View>
          ) : null}
          {needPrev ? (
            <View ref={prevRef} collapsable={false} style={{ width: winW, height: winH }} onLayout={needNext ? undefined : onNeighbourReady}>
              <PageSheet page={page - 1} dark={dark} text={!pageView} />
            </View>
          ) : null}
        </View>
      ) : null}
      <StatusBar style={dark ? 'light' : 'dark'} />
      <GestureDetector gesture={pan}>
      <Animated.View ref={pageRef} collapsable={false} style={StyleSheet.absoluteFill}>
      <PageBg dark={dark} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: PAGE_MARGIN, paddingBottom: insets.bottom + 150 }}>
        <Pressable accessibilityLabel="إظهار أدوات القراءة" onPress={toggleControls} style={() => null}>
          {pageView ? (
            qcfReady ? <QcfPageView page={page} zoom={zoom} tasmee={tasmee} current={listening ? audio.ayah : null} onPickSurah={pickSurah} held={held} onHold={onHold} onTap={onTapWord} onFlag={onFlag} dark={dark} highlights={prefs.highlights} /> : <View style={{ minHeight: 600 }} />
          ) : null}
          {pageView ? null : blocks.map((b, i) => (
            <View key={b.surah} style={i > 0 ? { marginTop: 18 } : null}>
              {/* Surah banner: at the top of the page, and wherever a surah begins */}
              {i === 0 ? <PageHead page={page} surah={b.surah} onPickSurah={pickSurah} dark={dark} /> : null}
              {b.starts ? (
                <SurahBanner surah={b.surah} onPress={pickSurah} />
              ) : null}
              {/* الفاتحة counts the basmala as its first ayah; التوبة has none */}
              {b.starts && b.surah !== 1 && b.surah !== 9 ? (
                <AyahText size={26} lineHeight={52} color={dark ? DARK.ink : undefined} style={[{ textAlign: 'center', marginTop: 10 }, basmala() ? { fontFamily: basmala()!.fontFamily } : null]}>
                  {basmala()?.text ?? ''}
                </AyahText>
              ) : null}
              <AyahText size={size} lineHeight={size * 1.95} color={dark ? DARK.ink : undefined} style={[{ textAlign: 'justify', marginTop: 6 }, b.fontFamily ? { fontFamily: b.fontFamily } : null]}>
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
                              <Text key={i} style={current ? styles.wCurrent : state === 'pending' ? styles.wHidden : state === 'ok' ? null : state === 'unsure' ? styles.wUnsure : styles.wCheck}>
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
              <Image source={require('../../assets/brand/page-frame.png')} style={StyleSheet.absoluteFill} contentFit="fill" />
              {/* Thmanyah Serif Display Black, about 18pt, as in the design */}
              <Display size={18} lineHeight={22} color={dark ? DARK.number : '#2E2F39'}>
                {ar(page)}
              </Display>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Body size={14} weight="medium" color={colors.primary}>
                {/* the hizb-quarter marker needs per-page hizb data, not imported yet */}
              </Body>
            </View>
          </View>
        </Pressable>
      </ScrollView>
      </Animated.View>
      </GestureDetector>
      {PAGE_FLIP && canNext ? (
        <PageCurl paper={dark ? DARK.paper : undefined} progress={forward} visible={showForward} width={winW} height={winH} leaf={curImg ? shotView(curImg) : <PageSheet page={page} dark={dark} text={!pageView} />} under={nextImg ? shotView(nextImg) : <PageSheet page={page + 1} dark={dark} text={!pageView} />} />
      ) : null}
      {PAGE_FLIP && canPrev ? (
        <PageCurl paper={dark ? DARK.paper : undefined} progress={backward} visible={showBackward} width={winW} height={winH} leaf={prevImg ? shotView(prevImg) : <PageSheet page={page - 1} dark={dark} text={!pageView} />} under={curImg ? shotView(curImg) : <PageSheet page={page} dark={dark} text={!pageView} />} />
      ) : null}


      {!controls && listening && !tasmee.note ? (
        <View style={[styles.tasmee, { top: insets.top + 6 }]} pointerEvents="box-none">
          <PressScale accessibilityRole="button" accessibilityLabel="إيقاف التلاوة" onPress={listen} feedback="tap">
            <Squircle radius={22} fill="rgba(255,255,255,0.85)" glow="glass" style={styles.nowPlaying}>
              <ThiqalIcon name="pause" size={18} color={colors.primary} />
              <Caption color={colors.primary}>{audio.reciter ? audio.reciter.name : ''}</Caption>
            </Squircle>
          </PressScale>
        </View>
      ) : null}

      {!controls && tasmee.alert ? (
        <Animated.View entering={fadeIn} exiting={fadeOut} style={[styles.tasmee, { top: insets.top + 6 }]} pointerEvents="none">
          <View style={styles.alert} accessibilityLiveRegion="assertive">
            <Body size={14} weight="bold" color={colors.white}>
              {tasmee.alert.kind === 'skipped-ayah' ? 'تأكد من هذه الآية' : 'تأكد من هذه الكلمة'}
            </Body>
            {tasmee.alert.word ? (
              <Body size={16} weight="bold" color={colors.white}>
                {tasmee.alert.kind === 'missing' ? `فاتتك: ${tasmee.alert.word}` : tasmee.alert.word}
              </Body>
            ) : null}
          </View>
        </Animated.View>
      ) : null}

      {heardNote ? (
        <Animated.View entering={fadeIn} exiting={fadeOut} style={[styles.tasmee, { top: insets.top + 6 }]} pointerEvents="none">
          <Squircle radius={16} fill="rgba(255,255,255,0.92)" glow="glass" style={styles.note}>
            <Body size={15} weight="bold" color={colors.ink} style={{ textAlign: 'center' }}>
              {heardNote}
            </Body>
          </Squircle>
        </Animated.View>
      ) : null}

      {!controls && !tasmee.alert && tasmee.note ? (
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
        <View style={[styles.tasmee, { bottom: insets.bottom + 14 }]} pointerEvents="box-none">
          <View style={styles.bar}>
            {/* the main button: start listening, or stop (a square) while listening */}
            {tasmee.listening ? (
              <Orb colors={['#62C26A', '#2F8A3A']} icon="stop" label="إيقاف الاستماع" onPress={tasmee.stop} size={76} live />
            ) : (
              <Orb colors={['#4B6FB3', '#243F78']} icon="mic" label="ابدأ التسميع" onPress={tasmee.start} size={76} />
            )}
            <View style={{ flex: 1, gap: 10 }}>
              {marking ? (
                <View style={[styles.chip, { alignSelf: 'flex-start', backgroundColor: 'rgba(255,214,64,0.9)' }]}>
                  <Body size={13} weight="bold" lineHeight={18}>
                    اضغط على آية لتظليلها
                  </Body>
                </View>
              ) : null}
              {tasmee.listening || tasmee.elapsed > 0 ? (
                <View style={styles.chips}>
                  {/* slips found so far · where you are · time listening */}
                  <View style={[styles.chip, { backgroundColor: tasmee.errors ? '#C0392B' : 'rgba(192,57,43,0.55)' }]} accessibilityLabel={`${ar(tasmee.errors)} مواضع للمراجعة`}>
                    <Icon name="alert" size={14} color="#FFFFFF" outline />
                    <Body size={13} weight="bold" color="#FFFFFF" lineHeight={18}>
                      {ar(tasmee.errors)}
                    </Body>
                  </View>
                  {tasmee.position ? (
                    <View style={[styles.chip, { backgroundColor: '#7CB342' }]}>
                      <Body size={13} weight="bold" color="#FFFFFF" lineHeight={18}>
                        {posLabel(tasmee.position)}
                      </Body>
                    </View>
                  ) : null}
                  <View style={[styles.chip, { backgroundColor: 'rgba(255,255,255,0.85)' }]}>
                    <View style={[styles.recDot, { opacity: tasmee.listening ? 1 : 0.35 }]} />
                    <Body size={13} weight="bold" lineHeight={18}>
                      {clock(tasmee.elapsed)}
                    </Body>
                  </View>
                </View>
              ) : null}
              <View style={styles.tools}>
                <Tool icon="bookOpen" label="اختر السورة" onPress={pickSurah} />
                <Tool icon={tasmee.hideText ? 'eyeOff' : 'eye'} label={tasmee.hideText ? 'أظهر الآيات' : 'أخفِ الآيات'} on={tasmee.hideText} onPress={() => tasmee.setHideText((v) => !v)} />
                <Tool icon="highlighter" label={marking ? 'إنهاء التظليل' : 'ظلّل آية'} on={marking} onPress={() => setMarking((v) => !v)} />
                <Tool icon="layers" label={view === 'page' ? 'عرض النص المتصل' : 'عرض صفحة المصحف'} on={view === 'text'} onPress={() => setPrefs({ mushafView: view === 'page' ? 'text' : 'page' })} />
                <Tool icon="help" label="أظهر الكلمة التالية" onPress={tasmee.hint} />
                {tasmee.active && !tasmee.listening ? <Tool icon="clean" label="إخفاء الكل والبدء من جديد" onPress={tasmee.reset} /> : null}
              </View>
            </View>
          </View>
        </View>
      ) : null}

      {controls ? (
        <>
          {/* Top: back (start) · page turner (centre) · listen (end) */}
          <Animated.View entering={fadeIn} exiting={fadeOut} style={[styles.topStrip, { paddingTop: insets.top + 8 }]}>
          <View style={styles.topBar}>
            <PressScale accessibilityRole="button" accessibilityLabel="رجوع" onPress={() => (router.canGoBack() ? router.back() : router.replace('/quran'))} hitSlop={6} scaleTo={0.92}>
              <Squircle radius={24} fill="rgba(255,255,255,0.75)" glow="glass" style={styles.zoomBtn}>
                <ThiqalIcon name="fwd" size={22} color={colors.ink} />
              </Squircle>
            </PressScale>
            {/* The surah of this page; tap to choose another */}
            <Pressable accessibilityRole="button" accessibilityLabel={`سورة ${quranIndex.surahs[(onPage[0]?.surah ?? 1) - 1]?.name ?? ''} · تغيير السورة`} onPress={pickSurah}>
              <Squircle radius={24} fill="rgba(255,255,255,0.8)" glow="glass" style={styles.pager}>
                <Body size={15} weight="bold" lineHeight={22} numberOfLines={1}>
                  {`سُورَةُ ${quranIndex.surahs[(onPage[0]?.surah ?? 1) - 1]?.name ?? ''}`}
                </Body>
                <Icon name="chevronDown" size={18} color={colors.ink} />
              </Squircle>
            </Pressable>
            <PressScale accessibilityRole="button" accessibilityLabel={listening ? 'إيقاف التلاوة' : 'استمع من هذه الصفحة'} onPress={listen} feedback="tap" scaleTo={0.92}>
              <Squircle radius={24} fill={colors.primary} glow="frost" noise={51.2} style={styles.listenBtn}>
                <ThiqalIcon name={listening ? 'pause' : 'play'} size={20} color={colors.white} />
              </Squircle>
            </PressScale>
          </View>
          {listening && audio.reciter ? (
            <View style={{ marginTop: 8, marginHorizontal: 24, gap: 2 }}>
              {/* where the recitation is in this surah; drag to move through it */}
              <Timeline tone={dark ? 'light' : 'dark'} />
              <Caption numberOfLines={1} style={{ textAlign: 'center' }}>
                {recitationCredit(audio.reciter)}
              </Caption>
            </View>
          ) : null}
          </Animated.View>

          {/* Bottom, as drawn: zoom, then search */}
          <Animated.View style={[styles.controls, { bottom: insets.bottom + 24 }, lift]} pointerEvents="box-none">
            {found ? (
              <Squircle radius={24} fill="rgba(255,255,255,0.96)" glow="glass" style={styles.results}>
                {surahHit ? (
                  <Pressable
                    accessibilityRole="link"
                    onPress={() => {
                      setFound(null);
                      setQuery('');
                      Keyboard.dismiss();
                      goTo(quranIndex.surahs[surahHit - 1].page);
                    }}
                    style={styles.result}
                  >
                    <Caption color={colors.primary}>{`سورة · ص ${ar(quranIndex.surahs[surahHit - 1].page)}`}</Caption>
                    <Display size={18}>{`سُورَةُ ${quranIndex.surahs[surahHit - 1].name}`}</Display>
                  </Pressable>
                ) : null}
                {found.length || surahHit ? (
                  <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 260 }}>
                    {found.map((h, i) => (
                      <Pressable key={h.key} accessibilityRole="link" onPress={() => openFound(h.key)} style={[styles.result, (i > 0 || !!surahHit) && styles.resultSep]}>
                        <Caption color={colors.primary}>{`${quranIndex.surahs[h.surah - 1]?.name ?? ''} · الآية ${ar(h.ayah)} · ص ${ar(pageOfAyah(h.key) ?? 0)}`}</Caption>
                        <MadinahAyah surah={h.surah} ayah={h.ayah} size={17} numberOfLines={2} />
                      </Pressable>
                    ))}
                  </ScrollView>
                ) : (
                  <Caption style={{ padding: 14, textAlign: 'center' }}>لا نتائج لهذه الكلمات</Caption>
                )}
              </Squircle>
            ) : null}
            <View style={styles.zoomRow}>
              <ZoomButton icon="minus" label="تصغير" onPress={() => setZoom((z) => Math.max(70, z - 10))} />
              <Squircle radius={24} fill={SOLID} style={styles.zoomValue}>
                <ThiqalIcon name="search" size={20} color={colors.white} />
                <Body size={16} weight="bold" lineHeight={22} color={colors.white}>
                  {ar(zoom)}
                </Body>
              </Squircle>
              <ZoomButton icon="plus" label="تكبير" onPress={() => setZoom((z) => Math.min(160, z + 10))} />
              <GlassRound label={dark ? 'الوضع الفاتح' : 'الوضع الداكن'} onPress={() => setPrefs({ quranDark: !dark })}>
                <Icon name={dark ? 'sun' : 'moon'} size={22} color={colors.white} />
              </GlassRound>
            </View>
            <Squircle radius={30} fill="rgba(255,255,255,0.8)" glow="glass" style={styles.search}>
              <ThiqalIcon name="search" size={22} color={colors.primary} />
              <TextInput
                value={query}
                onChangeText={(t) => {
                  setQuery(t);
                  if (!t.trim()) setFound(null);
                }}
                onSubmitEditing={runSearch}
                returnKeyType="search"
                placeholder={m.searchPlaceholder}
                placeholderTextColor={colors.primary}
                style={[styles.searchInput, { fontFamily: F.display }]}
                accessibilityLabel={m.searchPlaceholder}
              />
              {query ? (
                <Pressable accessibilityRole="button" accessibilityLabel="ابحث" hitSlop={8} onPress={runSearch}>
                  <Icon name="arrowLeft" size={20} color={colors.primary} />
                </Pressable>
              ) : null}
            </Squircle>
          </Animated.View>
        </>
      ) : null}
    </View>
  );
}

/** A still copy of a neighbouring page (beneath, or coming back over, the turning leaf). */
const PageSheet = memo(function PageSheet({ page, dark = false, text = false }: { page: number; dark?: boolean; text?: boolean }) {
  const insets = useSafeAreaInsets();
  const qcf = qcf4Available() && !text;
  const ready = useQcf4Fonts(page);
  const ayat = useMemo(() => ayatOnPage(page), [page]);
  return (
    <View style={StyleSheet.absoluteFill}>
      <PageBg dark={dark} />
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: PAGE_MARGIN }}>
        {qcf ? (
          ready ? <QcfPageView page={page} zoom={100} current={null} onPickSurah={() => undefined} dark={dark} /> : null
        ) : (
          <>
            <SurahBanner surah={ayat[0]?.surah ?? 1} onPress={() => undefined} />
            <AyahText size={21} lineHeight={41} color={dark ? DARK.ink : undefined} style={{ textAlign: 'justify', marginTop: 6 }}>
              {ayat.map((x) => getAyah(x.surah, x.ayah)?.text ?? '').join(' ')}
            </AyahText>
          </>
        )}
      </View>
    </View>
  );
});

/**
 * One Madinah Mushaf page from the QCF4 data: the surah banner from the design where the page
 * has a surah header, the basmala glyph, and 15 justified lines of glyphs. Glyph size is set so
 * the widest line of the whole mushaf fits the width, so every page has the same size, as in print.
 * In the recitation check a hidden word keeps its place (transparent), exactly like the text mode.
 */
function QcfPageView({ page, zoom, tasmee, current, onPickSurah, held = null, onHold, onTap, onFlag, dark = false, highlights }: { page: number; zoom: number; tasmee?: ReturnType<typeof useTasmee>; current: string | null; onPickSurah: () => void; held?: string | null; onHold?: (key: string) => void; onTap?: (key?: string) => void; onFlag?: (key: string, word: number) => void; dark?: boolean; highlights?: string[] }) {
  const ink = dark ? DARK.ink : QURAN_INK;
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const pg = qcf4Page(page);
  // At 100% the page is the printed page, line for line. Zoomed in, the same words in the same order
  // flow onto as many lines as the screen needs (no sideways scrolling, nothing cut off).
  const reflow = zoom > 100;
  // As the printed mushaf on a phone: the lines run nearly edge to edge (the glyphs as large as
  // the width allows) and the fifteen lines share the screen's height evenly.
  const w = Math.min(width, 560) - 2 * PAGE_MARGIN;
  // Sized on what the words of the page really take (about 16.2 em a line), not the font's
  // wider line frame (18.8 em): larger, clearer glyphs with even word spacing.
  const size = (w / lineEm(page)) * (zoom / 100);
  const lineH = reflow ? size * 2.05 : Math.min(size * 2.3, Math.max(size * 1.75, (height - insets.top - insets.bottom - 150) / 15));
  const centred = page <= 2; // the first two pages are set in a narrow block, centred
  const row = isRTL() ? 'row' : 'row-reverse';
  // Words counted per ayah the same way the recitation check counts them.
  const wordCount = ayahWords;
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
  // One letter per glyph saying how it is drawn; a line redraws only when its own letters change
  // (while reciting, only the line with the new word redraws, not the whole page).
  const codesOf = (l: Extract<Qcf4Line, { g: string }>) =>
    Array.from(l.g, (_, gi) => {
      const ai = l.a[gi];
      const wi = l.i[gi];
      if (wi === -1 && ai) return 'm';
      let c = ai && held && ayahKey(ai) === held ? 'k' : current && ai && ayahKey(ai) === current ? 'l' : ai && highlights?.includes(ayahKey(ai)) ? 'y' : 'n';
      if (tasmee?.active && ai && wi >= 0) {
        const key = ayahKey(ai);
        const { state, current: now } = tasmee.wordState(key, wi, wordCount(key));
        c = now ? 'c' : state === 'pending' ? 'h' : state === 'ok' ? 'n' : state === 'unsure' ? 'u' : 'x';
      }
      return c;
    }).join('');
  const glyphs = (l: Extract<Qcf4Line, { g: string }>, li: number) => <Glyphs key={`g${li}`} l={l} codes={codesOf(l)} font={pg.f} size={size} lineH={lineH} ink={ink} onHold={onHold} onTap={onTap} onFlag={onFlag} />;
  // Rows of the page: headers and basmala as they are; word lines either kept line for line,
  // or (zoomed) joined into one flowing paragraph per run of lines.
  const rows: React.ReactNode[] = [];
  let flow: React.ReactNode[] = [];
  pg.l.forEach((l, li) => {
    if ('h' in l) {
      rows.push(
        <View key={li} style={{ marginTop: li ? 10 : 0, marginBottom: 4 }}>
          <SurahBanner surah={l.h} onPress={onPickSurah} />
        </View>,
      );
      return;
    }
    if ('b' in l) {
      rows.push(
        <Text key={li} style={{ fontFamily: l.f, fontSize: size, lineHeight: lineH, color: ink, textAlign: 'center' }}>
          {l.b}
        </Text>,
      );
      return;
    }
    const line = glyphs(l, li);
    if (!reflow) {
      rows.push(
        <View key={li} style={{ flexDirection: row, justifyContent: centred ? 'center' : 'space-between', gap: centred ? size * 0.3 : 0, height: lineH, alignItems: 'center' }}>
          {line}
        </View>,
      );
      return;
    }
    flow = [...flow, line];
    const next = pg.l[li + 1];
    if (next && 'a' in next) return; // the paragraph goes on
    rows.push(
      <View key={li} style={{ flexDirection: row, flexWrap: 'wrap', columnGap: size * 0.28, alignItems: 'center' }}>
        {flow}
      </View>,
    );
    flow = [];
  });
  return (
    <View style={{ width: w, alignSelf: 'center' }}>
      {/* The design keeps the banner at the top of every page (it opens the surah list) */}
      {/* As the printed mushaf: a slim running head on every page (juz on the right, surah on the
          left); the ornamented surah banner appears only where a surah begins. */}
      <PageHead page={page} surah={firstSurah} onPickSurah={onPickSurah} dark={dark} />
      {rows}
    </View>
  );
}

/** The glyphs of one mushaf line, drawn from their codes (see `codesOf`); redrawn only when those change. */
const Glyphs = memo(function Glyphs({ l, codes, font, size, lineH, ink, onHold, onTap, onFlag }: { l: Extract<Qcf4Line, { g: string }>; codes: string; font: string; size: number; lineH: number; ink: string; onHold?: (key: string) => void; onTap?: (key?: string) => void; onFlag?: (key: string, word: number) => void }) {
  const base = { fontFamily: font, fontSize: size, lineHeight: lineH, color: ink };
  return (
    <>
      {Array.from(l.g, (ch, gi) => {
        const c = codes[gi];
        const k = `${gi}-${ch}`;
        // The ayah end: the design's teal medallion with the ayah number, in place of the font's mark
        // in the same 1-em box as the font's own mark, drawn a little smaller so it never touches the words beside it
        if (c === 'm')
          return (
            <View key={k} style={{ width: size * 1.004, alignItems: 'center' }}>
              <AyahMarker n={Number(ayahKey(l.a[gi]).split(':')[1])} scale={(size / 21) * 0.86} />
            </View>
          );
        const style = c === 'y' ? styles.wMarked : c === 'k' ? styles.wHeld : c === 'l' ? styles.wListen : c === 'c' ? styles.wCurrent : c === 'h' ? styles.wHidden : c === 'x' ? styles.wCheck : c === 'u' ? styles.wUnsure : null;
        const ai = l.a[gi];
        return (
          <Text key={k} style={[base, style]} onPress={(c === 'x' || c === 'u') && onFlag && ai ? () => onFlag(ayahKey(ai), l.i[gi]) : onHold && ai && onTap ? () => onTap(ayahKey(ai)) : undefined} onLongPress={onHold && ai ? () => onHold(ayahKey(ai)) : undefined} suppressHighlighting>
            {ch}
          </Text>
        );
      })}
    </>
  );
});

/** The running head of a page: «الجزء الثاني عشر» on the right, «سورة هود» on the left (it opens the surah list). */
function PageHead({ page, surah, onPickSurah, dark }: { page: number; surah: number; onPickSurah: () => void; dark: boolean }) {
  const r = readingAt(page);
  // the surah's voweled name, as in the app's surah list
  const name = quranIndex.surahs[surah - 1]?.name ?? '';
  const tint = dark ? '#D9A08E' : '#A8503A';
  return (
    <View style={[styles.head, { flexDirection: isRTL() ? 'row' : 'row-reverse' }]}>
      <Text style={[styles.headText, { color: tint }]}>{juzNameVoweled(r.juz)}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`سورة ${name} · تغيير السورة`} hitSlop={8} onPress={onPickSurah}>
        <Text style={[styles.headText, { color: tint }]}>{`سُورَةُ ${name}`}</Text>
      </Pressable>
    </View>
  );
}

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
        {SURAH_TITLES[surah] ? (
          // the founder's calligraphy for every surah
          <Image source={SURAH_TITLES[surah]} style={styles.bannerTitle} contentFit="contain" accessibilityLabel={`سورة ${name.replace(/[\u064B-\u0652\u0670]/g, '')}`} />
        ) : (
          // Free calligraphic fallback until each surah has its drawn title: Amiri Quran (SIL OFL).
          <Text style={styles.bannerName}>{`سورة ${name.replace(/[\u064B-\u0652\u0670]/g, '')}`}</Text>
        )}
      </View>
    </PressScale>
  );
}


const NOTES: Record<Exclude<TasmeeNote, null>, string> = {
  'web-preview': 'معاينة آلية · نسخة الويب لا تستمع، والتسميع يعمل في تطبيق iOS وAndroid',
  'model-unavailable': 'نموذج التسميع لم يُنشر بعد',
  'model-missing': 'يحتاج التسميع إلى تنزيل نموذج الاستماع مرة واحدة ·',
  'mic-failed': 'تعذّر تشغيل الميكروفون. تحقق من إذنه في إعدادات الجهاز.',
};

/** Round glossy button of the recitation check. */
function Orb({ colors: c, icon, label, onPress, size = 68, live = false }: { colors: [string, string]; icon: 'clean' | 'mic' | 'help' | 'wave' | 'stop'; label: string; onPress: () => void; size?: number; live?: boolean }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      {/* While listening, soft rings spread from the button: the app is hearing you. */}
      <Ripple size={size} color={c[0]} active={live} />
      <PressScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} scaleTo={0.9} feedback={icon === 'mic' || icon === 'wave' || icon === 'stop' ? 'soft' : 'select'}>
        <Breathe active={live} scale={1.04}>
          <LinearGradient colors={c} start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }} style={[styles.orb, { width: size, height: size, borderRadius: size / 2 , borderCurve: 'continuous'}]}>
            <Icon name={icon} size={size * 0.44} color="#FFFFFF" />
          </LinearGradient>
        </Breathe>
      </PressScale>
    </View>
  );
}


/** «البقرة ٢٥٥» for an ayah key (no middle dot: beside Arabic digits it reads as a zero). */
function posLabel(key: string) {
  const [su, a] = key.split(':').map(Number);
  return `${(quranIndex.surahs[su - 1]?.name ?? '').replace(/[\u064B-\u0652\u0670\u0640]/g, '')} ${ar(a)}`;
}
/** ٠٠:١٢ */
const clock = (sec: number) => ar(`${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`);

/** A small round tool of the recitation bar; `on` fills it when its option is active. */
function Tool({ icon, label, onPress, on = false }: { icon: IconName; label: string; onPress: () => void; on?: boolean }) {
  return (
    <PressScale accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: on }} onPress={onPress} hitSlop={4} scaleTo={0.9} feedback="select">
      <View style={[styles.tool, on && { backgroundColor: colors.primary }]}>
        <Icon name={icon} size={20} color={on ? '#FFFFFF' : colors.ink} outline />
      </View>
    </PressScale>
  );
}

function ZoomButton({ icon, label, onPress }: { icon: 'plus' | 'minus'; label: string; onPress: () => void }) {
  return (
    <GlassRound label={label} onPress={onPress}>
      <ThiqalIcon name={icon} size={22} color={colors.white} />
    </GlassRound>
  );
}

/** 48pt round solid black button holding a white icon (over the page, always readable). */
function GlassRound({ label, onPress, children }: { label: string; onPress: () => void; children: React.ReactNode }) {
  return (
    <PressScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6} scaleTo={0.92}>
      <Squircle radius={24} fill={SOLID} style={styles.zoomBtn}>
        {children}
      </Squircle>
    </PressScale>
  );
}

const SOLID = '#111114';
/** Letters only, for matching a typed surah name (search side only). */
const plainSearch = (t: string) =>
  t
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .trim();

const styles = StyleSheet.create({
  banner: { height: 61, alignItems: 'center', justifyContent: 'center' },
  // edge to edge with the lines of the page below it
  head: { justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 0, height: 34, marginBottom: 2 },
  headText: { fontFamily: F.displayBold, fontSize: 15, lineHeight: 30 },
  // The exported artwork carries a 4pt soft edge at the sides, 6pt above and 9pt below the 354×61 banner.
  bannerArt: { position: 'absolute', left: -4, right: -4, top: -6, bottom: -9 },
  bannerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bannerTitle: { width: 140, height: 44 },
  bannerName: { fontFamily: F.display, fontSize: 24, lineHeight: 40, color: colors.white, textAlign: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 },
  pageNo: { width: 52.49, height: 32.157, alignItems: 'center', justifyContent: 'center' },
  tasmee: { position: 'absolute', start: 20, end: 20, alignItems: 'center', gap: 10 },
  tasmeeRow: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  bar: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'flex-end', gap: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 28, paddingHorizontal: 10, borderRadius: 14, borderCurve: 'continuous' },
  recDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#E53935' },
  tools: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tool: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.85)', boxShadow: '0 2px 8px rgba(20,24,40,0.12)' },
  note: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14 },
  orb: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.65)', boxShadow: '0 6px 14px rgba(0,0,0,0.22)' },
  // Word states of the recitation check. Hidden words keep their width so the line layout does not move.
  wHidden: { color: 'transparent' },
  wListen: { color: colors.primary },
  // the ayah whose actions are open
  wHeld: { backgroundColor: 'rgba(3,90,95,0.14)' },
  // a highlighted ayah: a soft highlighter yellow
  wMarked: { backgroundColor: 'rgba(255,214,64,0.45)' },
  nowPlaying: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 },
  // frosted strip so the bar reads as its own layer above the page (and never sits on the surah banner)
  offscreen: { position: 'absolute', top: 0, left: -20000 },
  topStrip: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: 'rgba(237,232,225,0.96)', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(39,40,51,0.08)' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pager: { height: 48, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, maxWidth: 220 },
  listenBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  wCurrent: { color: '#1F7A33', backgroundColor: '#CDE9C3' },
  // a word to re-check: clearly marked, as a teacher's red pencil would
  // one close-sounding letter the listening model may have misheard: to look at, not a slip
  wUnsure: { color: '#8A5A00', backgroundColor: '#FCEFD2' },
  wCheck: { color: '#B3261E', backgroundColor: '#F9DEDC', textDecorationLine: 'underline', textDecorationColor: '#B3261E' },
  alert: { alignSelf: 'center', alignItems: 'center', gap: 2, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 18, borderCurve: 'continuous', backgroundColor: '#B3261E', boxShadow: '0 6px 18px rgba(120,20,20,0.3)' },
  controls: { position: 'absolute', start: 20, end: 20, gap: 14, alignItems: 'center' },
  zoomRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  zoomBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  zoomValue: { height: 48, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 22 },
  results: { alignSelf: 'stretch', paddingVertical: 4 },
  result: { paddingHorizontal: 16, paddingVertical: 10, gap: 2 },
  resultSep: { borderTopWidth: 1, borderTopColor: colors.hairline },
  search: { alignSelf: 'stretch', height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20 },
  searchInput: { flex: 1, minWidth: 0, fontSize: 15, color: colors.primary, textAlign: 'center' },
});
