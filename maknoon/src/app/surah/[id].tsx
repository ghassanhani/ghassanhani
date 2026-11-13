import { router, useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { Pressable } from '@/components/Tap';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Backdrop } from '@/components/Backdrop';
import { Squircle } from '@/components/Squircle';
import { AyahText, Body, Caption, Display } from '@/components/Typography';
import { RoundButton } from '@/components/ui';
import { ayatLabel, basmala, getAyah, quranSource } from '@/content/quran';
import { quranIndex } from '@/content/worship';
import { usePrefs } from '@/store/prefs';
import { colors, space } from '@/theme/tokens';

/**
 * Ayah-mode reader (SPEC §2.1, M1): any surah, one ayah per row, canonical text
 * exactly as imported, with the source credit. Tap an ayah to open its links.
 */
export default function SurahScreen() {
  const { id = '1' } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [prefs] = usePrefs();
  const n = Math.min(114, Math.max(1, Number(id) || 1));
  const meta = quranIndex.surahs[n - 1];
  const ayat = Array.from({ length: meta.ayat }, (_, i) => i + 1);
  const size = prefs.quranSize;
  const opening = n !== 1 && n !== 9 ? basmala() : null; // الفاتحة counts it as ayah 1; التوبة has none

  return (
    <View style={{ flex: 1 }}>
      <Backdrop name="sand" />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <RoundButton icon="chevronRight" label="رجوع" size={40} iconSize={22} onPress={() => (router.canGoBack() ? router.back() : router.replace('/quran'))} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Display size={22} numberOfLines={1}>
            {meta.name}
          </Display>
          <Caption>{`${meta.type} · ${ayatLabel(meta.ayat)}`}</Caption>
        </View>
        <View style={{ width: 40 }} />
      </View>
      <FlatList
        data={ayat}
        keyExtractor={(a) => String(a)}
        initialNumToRender={12}
        windowSize={7}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: space.gutter, paddingTop: 12, paddingBottom: insets.bottom + 32, gap: 10 }}
        ListHeaderComponent={
          opening ? (
            <AyahText size={size + 2} lineHeight={(size + 2) * 2} style={[{ textAlign: 'center' }, { fontFamily: opening.fontFamily }]}>
              {opening.text}
            </AyahText>
          ) : undefined
        }
        renderItem={({ item: a }) => {
          const ayah = getAyah(n, a);
          if (!ayah) return null;
          return (
            <Pressable accessibilityRole="link" accessibilityLabel={`${meta.name} الآية ${a}`} onPress={() => router.push(`/ayah/${n}:${a}`)}>
              <Squircle radius={24} fill="rgba(255,255,255,0.7)" stroke="#FFFFFF" glow="glass" style={styles.ayah}>
                <AyahText size={size} lineHeight={size * 2} style={{ fontFamily: ayah.fontFamily }}>
                  {ayah.text}
                </AyahText>
              </Squircle>
            </Pressable>
          );
        }}
        ListFooterComponent={
          <View style={{ gap: 4, paddingTop: 8, alignItems: 'center' }}>
            <Body size={12} color={colors.primary}>
              {quranSource.credit}
            </Body>
            <Caption>النص يُعرض كما ورد من مصدره دون أي تغيير.</Caption>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.gutter, paddingBottom: 8 },
  ayah: { paddingVertical: 14, paddingHorizontal: 18 },
});
