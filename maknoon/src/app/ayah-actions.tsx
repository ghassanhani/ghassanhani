import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { Share, StyleSheet, View } from 'react-native';
import { Pressable } from '@/components/Tap';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/Icon';
import { haptic } from '@/components/motion';
import { Body, Display } from '@/components/Typography';
import { ar, getAyah } from '@/content/quran';
import { quranIndex } from '@/content/worship';
import { toggleAyah, usePlayer } from '@/recitation/player';
import { setPrefs, usePrefs } from '@/store/prefs';
import { colors } from '@/theme/tokens';

/**
 * What can be done with one ayah, opened by a long press on it in the mushaf (a system sheet).
 * Copy and share use the canonical text with its reference; nothing leaves the device unless the
 * reader shares it themselves.
 */
export default function AyahActions() {
  const insets = useSafeAreaInsets();
  const { key = '1:1' } = useLocalSearchParams<{ key?: string }>();
  const [s, a] = key.split(':').map(Number);
  const name = (quranIndex.surahs[s - 1]?.name ?? '').replace(/[ً-ْٰـ]/g, '');
  const [prefs] = usePrefs();
  const audio = usePlayer();
  const playing = audio.playing === key;
  const marked = prefs.bookmarks.includes(key);
  const lit = prefs.highlights.includes(key);
  const text = () => `${getAyah(s, a)?.text ?? ''}\n[${name}: ${ar(a)}]`;
  const open = (path: string) => {
    router.back();
    router.push(path as never);
  };

  const rows: { icon: IconName; label: string; run: () => void }[] = [
    {
      icon: playing ? 'pause' : 'play',
      label: playing ? 'إيقاف التلاوة' : 'استمع',
      run: () => {
        toggleAyah(s, a);
        router.back();
      },
    },
    { icon: 'translation', label: 'ترجمة', run: () => open(`/ayah/${key}`) },
    { icon: 'books', label: 'تفسير', run: () => open(`/ayah/${key}`) },
    {
      icon: 'bookmark',
      label: marked ? 'أزل الإشارة المرجعية' : 'أضف إشارة مرجعية',
      run: () => {
        setPrefs((p) => ({ bookmarks: marked ? p.bookmarks.filter((k) => k !== key) : [...p.bookmarks, key] }));
        router.back();
      },
    },
    {
      icon: 'highlighter',
      label: lit ? 'أزل التظليل' : 'ظلّل الآية',
      run: () => {
        setPrefs((p) => ({ highlights: lit ? p.highlights.filter((k) => k !== key) : [...p.highlights, key] }));
        router.back();
      },
    },
    {
      icon: 'copy',
      label: 'نسخ',
      run: () => {
        Clipboard.setStringAsync(text()).catch(() => undefined);
        router.back();
      },
    },
    {
      icon: 'share',
      label: 'شارك',
      run: () => {
        Share.share({ message: text() }).catch(() => undefined);
      },
    },
  ];

  return (
    <View style={[styles.sheet, { paddingBottom: insets.bottom + 8 }]}>
      <View style={styles.head}>
        <View style={styles.badge}>
          <Body size={12} weight="bold" color={colors.primary} lineHeight={16}>
            {`${ar(s)}:${ar(a)}`}
          </Body>
        </View>
        <Display size={19} style={{ flex: 1 }}>{`${name} · الآية ${ar(a)}`}</Display>
        <Pressable accessibilityRole="button" accessibilityLabel="إغلاق" hitSlop={10} onPress={() => router.back()}>
          <Icon name="close" size={20} color={colors.muted} />
        </Pressable>
      </View>
      {rows.map((r) => (
        <Pressable
          key={r.label}
          accessibilityRole="button"
          onPress={() => {
            haptic.select();
            r.run();
          }}
          style={({ pressed }) => [styles.row, pressed && { backgroundColor: 'rgba(3,90,95,0.06)' }]}
        >
          <Icon name={r.icon} size={22} color={colors.primary} />
          <Body size={16} weight="medium">
            {r.label}
          </Body>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: '#F7F4F1', paddingTop: 22 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(20,24,40,0.12)' },
  badge: { paddingHorizontal: 8, height: 26, borderRadius: 8, borderCurve: 'continuous', borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  row: { height: 54, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 22, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(20,24,40,0.08)' },
});
