import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { Pressable } from '@/components/Tap';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { haptic } from '@/components/motion';
import { Body, Caption, Display } from '@/components/Typography';
import { ar, ayatLabel } from '@/content/quran';
import { stripTashkeel } from '@/content/text';
import { quranIndex } from '@/content/worship';
import { F } from '@/theme/fonts';
import { colors } from '@/theme/tokens';

/**
 * The 114 surahs, as the system sheet (see the root layout): it slides up and away with the
 * platform's own motion and follows the finger when dragged down. Choosing a surah turns the
 * mushaf to its first page.
 */
export default function SurahPicker() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { current: c } = useLocalSearchParams<{ current?: string }>();
  const current = Number(c) || 1;
  const [q, setQ] = useState('');
  const needle = stripTashkeel(q.trim());
  const list = needle ? quranIndex.surahs.filter((x) => stripTashkeel(x.name).includes(needle) || String(x.n) === needle || ar(x.n) === needle) : quranIndex.surahs;
  const row = (x: (typeof list)[number]) => (
    <Pressable
      key={x.n}
      accessibilityRole="button"
      accessibilityState={{ selected: x.n === current }}
      onPress={() => {
        haptic.select();
        router.dismissTo({ pathname: '/mushaf', params: { page: String(x.page) } });
      }}
      style={[styles.row, x.n === current && { backgroundColor: 'rgba(3,90,95,0.08)' }]}
    >
      <View style={styles.no}>
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
  );
  return (
    // A fixed height and a plain scroll view of all 114 rows: inside the iOS form sheet a
    // virtualised list (FlatList) with two sheet heights was laid out empty. The sheet fits this
    // height (one detent, as the ayah sheet that works).
    <View style={[styles.sheet, { height: Math.round(height * 0.86) }]}>
      <View style={styles.top}>
        <View style={styles.head}>
          <Display size={20}>اختر السورة</Display>
        </View>
        <View style={styles.search}>
          <Icon name="search" size={18} color={colors.primary} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="اسم السورة أو رقمها"
            placeholderTextColor={colors.muted}
            accessibilityLabel="ابحث عن سورة"
            style={[styles.input, { fontFamily: F.sans }]}
          />
        </View>
      </View>
      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        // opens with the current surah near the top
        contentOffset={{ x: 0, y: needle ? 0 : Math.max(0, current - 3) * 56 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {list.map(row)}
        {!list.length ? <Caption style={{ padding: 16, textAlign: 'center' }}>لا نتائج</Caption> : null}
      </ScrollView>
    </View>
  );
}

const HEAD = 22 + 44 + 52; // pinned header: top room + title row + search

const styles = StyleSheet.create({
  sheet: { backgroundColor: '#F7F4F1' },
  top: { height: HEAD, paddingTop: 22, backgroundColor: '#F7F4F1' },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 10 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, marginHorizontal: 20, marginBottom: 8, paddingHorizontal: 14, borderRadius: 22, borderCurve: 'continuous', backgroundColor: '#FFFFFF' },
  input: { flex: 1, minWidth: 0, fontSize: 15, color: colors.ink, textAlign: 'right', paddingVertical: 0 },
  row: { height: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20 },
  no: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(3,90,95,0.08)', alignItems: 'center', justifyContent: 'center' },
});
