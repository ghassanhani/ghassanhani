import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, TextInput, View } from 'react-native';
import { MadinahAyah } from '@/components/MadinahAyah';
import { PageHeader } from '@/components/PageHeader';
import { Screen } from '@/components/Screen';
import { Caption } from '@/components/Typography';
import { Cta, GlassCard } from '@/components/ui';
import { ar } from '@/content/quran';
import { quranIndex } from '@/content/worship';
import { usePrefs } from '@/store/prefs';
import { F } from '@/theme/fonts';
import { colors } from '@/theme/tokens';

/** The reader's own note on one ayah (written by them, kept on the device only, saved as they type). */
export default function NoteScreen() {
  const { key = '1:1' } = useLocalSearchParams<{ key: string }>();
  const [s, a] = key.split(':').map(Number);
  const [prefs, setPrefs] = usePrefs();
  const id = `ayah:${key}`;
  const text = prefs.notes[id] ?? '';
  const setText = (t: string) =>
    setPrefs((p) => {
      const notes = { ...p.notes };
      if (t.trim()) notes[id] = t;
      else delete notes[id];
      return { notes };
    });

  return (
    <Screen backdrop="sand" withTabBar={false} header={<PageHeader title="ملاحظتي" fallback="/notes" />}>
      <GlassCard style={{ gap: 8 }}>
        <Caption color={colors.primary}>{`${quranIndex.surahs[s - 1]?.name ?? ''} · الآية ${ar(a)}`}</Caption>
        <MadinahAyah surah={s} ayah={a} size={20} />
      </GlassCard>
      <GlassCard style={{ gap: 8 }}>
        <TextInput
          value={text}
          onChangeText={setText}
          multiline
          autoFocus={!text}
          placeholder="اكتب ما تريد تذكّره عن هذه الآية…"
          placeholderTextColor={colors.muted}
          accessibilityLabel="ملاحظتك على الآية"
          style={[styles.input, { fontFamily: F.sans }]}
        />
        <Caption>تُحفظ تلقائيًا على جهازك فقط.</Caption>
      </GlassCard>
      <View style={{ alignItems: 'center' }}>
        <Cta label="تم" height={44} compact style={{ minWidth: 120 }} onPress={() => (router.canGoBack() ? router.back() : router.replace('/notes'))} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { minHeight: 160, fontSize: 16, lineHeight: 28, color: colors.ink, textAlign: 'right', textAlignVertical: 'top', writingDirection: 'rtl', outlineWidth: 0 },
});
