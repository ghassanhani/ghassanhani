import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Backdrop } from '@/components/Backdrop';
import { Icon } from '@/components/Icon';
import { Squircle } from '@/components/Squircle';
import { AyahText, Body, Caption, Display } from '@/components/Typography';
import { RoundButton } from '@/components/ui';
import { mushaf as m } from '@/content/design';
import { ar, ayahPlaceholder, ayatOnPage, getAyah } from '@/content/quran';
import { F } from '@/theme/fonts';
import { colors } from '@/theme/tokens';
import { quranIndex } from '@/content/worship';
import { type TasmeeNote, useTasmee } from '@/recitation/useTasmee';
import { usePrefs } from '@/store/prefs';

/**
 * Mushaf reading (page ٥٠, آل عمران ١–٩ in the design).
 * Text is reflowed from the verbatim Tanzil text with Amiri Quran. A page-faithful
 * Madani layout needs the QCF V2 glyph fonts and a licence (plan §4.1 / §5).
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
  const [prefs] = usePrefs();
  const size = (prefs.quranSize - 3) * (zoom / 100); // Settings size 24 → the design's 21pt page

  // A page of the Madinah mushaf from the page data. Without ?page= it is the design's page ٥٠ (آل عمران ١–٩).
  const onPage = useMemo(() => ayatOnPage(page), [page]);
  const keys = useMemo(() => onPage.map((x) => `${x.surah}:${x.ayah}`), [onPage]);
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

  return (
    <View style={{ flex: 1 }}>
      <Backdrop name="sand" />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 24, paddingBottom: insets.bottom + 150 }}>
        <Pressable accessibilityLabel="إظهار أدوات القراءة" onPress={() => setControls((v) => !v)}>
          {blocks.map((b, i) => (
            <View key={b.surah} style={i > 0 ? { marginTop: 18 } : null}>
              {/* Surah banner: at the top of the page, and wherever a surah begins */}
              {i === 0 || b.starts ? (
                <Squircle radius={16} gradient={['#2C7C6E', '#2C6E73']} glow="button" stroke="rgba(255,255,255,0.5)" style={styles.banner}>
                  <Display size={24} color={colors.white} lineHeight={34}>
                    {`سورة ${quranIndex.surahs[b.surah - 1]?.name ?? ''}`}
                  </Display>
                </Squircle>
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

          {/* Footer: page number at the start, hizb marker at the end; the recitation buttons sit between them */}
          <View style={styles.footer}>
            <Squircle radius={12} fill="rgba(3,90,95,0.12)" stroke="rgba(3,90,95,0.35)" style={styles.pageNo}>
              <Body size={14} weight="bold" color={colors.primary} lineHeight={18}>
                {ar(page)}
              </Body>
            </Squircle>
            <Body size={14} weight="medium" color={colors.primary}>
              {page === DEFAULT_PAGE ? m.marker : ''}
            </Body>
          </View>
        </Pressable>
      </ScrollView>

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
              <Orb colors={['#3C8C96', '#1F5C66']} icon="wave" label="إيقاف الاستماع" onPress={tasmee.stop} size={84} />
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

const NOTES: Record<Exclude<TasmeeNote, null>, string> = {
  'web-preview': 'معاينة آلية · نسخة الويب لا تستمع، والتسميع يعمل في تطبيق iOS وAndroid',
  'model-unavailable': 'نموذج التسميع لم يُنشر بعد',
  'model-missing': 'يحتاج التسميع إلى تنزيل نموذج الاستماع مرة واحدة ·',
  'mic-failed': 'تعذّر تشغيل الميكروفون. تحقق من إذنه في إعدادات الجهاز.',
};

/** Round glossy button of the recitation check. */
function Orb({ colors: c, icon, label, onPress, size = 68 }: { colors: [string, string]; icon: 'clean' | 'mic' | 'help' | 'wave'; label: string; onPress: () => void; size?: number }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}>
      <LinearGradient colors={c} start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }} style={[styles.orb, { width: size, height: size, borderRadius: size / 2 }]}>
        <Icon name={icon} size={size * 0.44} color="#FFFFFF" />
      </LinearGradient>
    </Pressable>
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
  banner: { height: 56, alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 },
  pageNo: { minWidth: 52, height: 30, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  tasmee: { position: 'absolute', start: 20, end: 20, alignItems: 'center', gap: 10 },
  tasmeeRow: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14 },
  orb: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.65)', boxShadow: '0 6px 14px rgba(0,0,0,0.22)' },
  // Word states of the recitation check. Hidden words keep their width so the line layout does not move.
  wHidden: { color: 'transparent' },
  wCurrent: { color: '#1F7A33', backgroundColor: '#CDE9C3' },
  wCheck: { color: '#A8862B' },
  controls: { position: 'absolute', start: 20, end: 20, gap: 14, alignItems: 'center' },
  zoomRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  zoomBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  zoomValue: { height: 48, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 22 },
  search: { alignSelf: 'stretch', height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20 },
  searchInput: { flex: 1, minWidth: 0, fontSize: 15, color: colors.primary, textAlign: 'center' },
});
