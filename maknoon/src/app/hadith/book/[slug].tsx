import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { Pressable } from '@/components/Tap';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Backdrop } from '@/components/Backdrop';
import { PageHeader } from '@/components/PageHeader';
import { Body, Caption, Display } from '@/components/Typography';
import { bookMeta, usePack } from '@/content/hadith';
import { ar } from '@/content/quran';
import { stripTashkeel } from '@/content/text';
import { colors, space } from '@/theme/tokens';

/**
 * One hadith book: its sections (كتاب الإيمان …); a section opens to its hadith, each opening the
 * hadith screen. Long lists are virtualised (Bukhari has 7,558 hadith).
 */
export default function HadithBook() {
  // ?section= opens one book of it directly (from a library shelf)
  const { slug, section: initial } = useLocalSearchParams<{ slug: string; section?: string }>();
  const insets = useSafeAreaInsets();
  const meta = bookMeta(slug ?? '');
  const { pack } = usePack(slug);
  const [section, setSection] = useState<string | null>(initial ?? null);
  const items = useMemo(() => (pack && section ? pack.hadith.filter((h) => h.b === section) : []), [pack, section]);

  return (
    <View style={{ flex: 1 }}>
      <Backdrop name="dune" />
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: space.gutter }}>
        <PageHeader title={section && pack ? pack.books[section] : meta?.name ?? ''} fallback="/hadith" onBack={section ? () => setSection(null) : undefined} />
      </View>
      {!section ? (
        <FlatList
          data={meta?.books ?? []}
          keyExtractor={(b) => b.no}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          renderItem={({ item: b }) => (
            <Pressable accessibilityRole="button" onPress={() => setSection(b.no)} style={styles.row}>
              <View style={styles.no}>
                <Body size={12} weight="bold" color={colors.primary} lineHeight={16}>
                  {ar(b.no)}
                </Body>
              </View>
              <View style={{ flex: 1 }}>
                <Display size={16}>{b.name}</Display>
                <Caption>{`${ar(b.count)} حديثًا`}</Caption>
              </View>
            </Pressable>
          )}
        />
      ) : !pack ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(h) => h.id}
          initialNumToRender={12}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          ListHeaderComponent={
            <Pressable accessibilityRole="button" onPress={() => setSection(null)} style={{ paddingVertical: 8 }}>
              <Body size={13} color={colors.primary}>
                ‹ كل الكتب
              </Body>
            </Pressable>
          }
          renderItem={({ item: h }) => (
            <Pressable accessibilityRole="button" onPress={() => router.push(`/hadith/${slug}:${h.id}`)} style={styles.row}>
              <View style={styles.no}>
                <Body size={12} weight="bold" color={colors.primary} lineHeight={16}>
                  {ar(h.n)}
                </Body>
              </View>
              <Body size={15} numberOfLines={2} style={{ flex: 1 }}>
                {stripTashkeel(h.matn || h.sanad)}
              </Body>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: space.gutter, paddingTop: 12, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 18, borderCurve: 'continuous', backgroundColor: 'rgba(255,255,255,0.7)' },
  no: { minWidth: 34, height: 34, paddingHorizontal: 6, borderRadius: 17, backgroundColor: 'rgba(3,90,95,0.08)', alignItems: 'center', justifyContent: 'center' },
});
