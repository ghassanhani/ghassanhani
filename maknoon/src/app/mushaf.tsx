import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Backdrop } from '@/components/Backdrop';
import { Icon } from '@/components/Icon';
import { Squircle } from '@/components/Squircle';
import { AyahText, Body, Display } from '@/components/Typography';
import { RoundButton } from '@/components/ui';
import { mushaf as m } from '@/content/design';
import { ar, ayahPlaceholder, ayatOnPage, getAyah } from '@/content/quran';
import { F } from '@/theme/fonts';
import { colors } from '@/theme/tokens';

/**
 * Mushaf reading (page ٥٠, آل عمران ١–٩ in the design).
 * Text is reflowed from the verbatim Tanzil text with Amiri Quran. A page-faithful
 * Madani layout needs the QCF V2 glyph fonts and a licence (plan §4.1 / §5).
 * Tap the page to show the reading controls.
 */
export default function MushafScreen() {
  const insets = useSafeAreaInsets();
  const [controls, setControls] = useState(false);
  const [zoom, setZoom] = useState(100);
  const size = 21 * (zoom / 100);

  // Page ٥٠ of the Madinah mushaf, from the KFGQPC page data (آل عمران ١–٩).
  const onPage = ayatOnPage(50);
  const ayat = onPage.map((x) => getAyah(x.surah, x.ayah));
  const fontFamily = ayat[0]?.fontFamily;
  const body = ayat.map((t, i) => t?.text ?? ayahPlaceholder(m.surahName, onPage[i].ayah)).join(' ');

  return (
    <View style={{ flex: 1 }}>
      <Backdrop name="sand" />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 24, paddingBottom: insets.bottom + 40 }}>
        <Pressable accessibilityLabel="إظهار أدوات القراءة" onPress={() => setControls((v) => !v)}>
          {/* Surah banner */}
          <Squircle radius={16} gradient={['#2C7C6E', '#2C6E73']} glow="button" stroke="rgba(255,255,255,0.5)" style={styles.banner}>
            <Display size={24} color={colors.white} lineHeight={34}>
              {m.surahTitle}
            </Display>
          </Squircle>

          <AyahText size={26} lineHeight={52} style={{ textAlign: 'center', marginTop: 10 }}>
            {m.basmala}
          </AyahText>

          <AyahText size={size} lineHeight={size * 1.95} style={[{ textAlign: 'justify', marginTop: 6 }, fontFamily ? { fontFamily } : null]}>
            {body}
          </AyahText>

          {/* Footer: page number + hizb marker */}
          <View style={styles.footer}>
            <Body size={14} weight="medium" color={colors.primary}>
              {m.marker}
            </Body>
            <Squircle radius={12} fill="rgba(3,90,95,0.12)" stroke="rgba(3,90,95,0.35)" style={styles.pageNo}>
              <Body size={14} weight="bold" color={colors.primary} lineHeight={18}>
                {m.page}
              </Body>
            </Squircle>
            <View style={{ width: 52 }} />
          </View>
        </Pressable>
      </ScrollView>

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
  controls: { position: 'absolute', start: 20, end: 20, gap: 14, alignItems: 'center' },
  zoomRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  zoomBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  zoomValue: { height: 48, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 22 },
  search: { alignSelf: 'stretch', height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20 },
  searchInput: { flex: 1, minWidth: 0, fontSize: 15, color: colors.primary, textAlign: 'center' },
});
