import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Pressable } from '@/components/Tap';
import { Icon } from '@/components/Icon';
import { MadinahAyah } from '@/components/MadinahAyah';
import { PageHeader } from '@/components/PageHeader';
import { Screen } from '@/components/Screen';
import { Body, Caption, Display } from '@/components/Typography';
import { GlassCard } from '@/components/ui';
import { ar } from '@/content/quran';
import { quranIndex } from '@/content/worship';
import { setPrefs, usePrefs } from '@/store/prefs';
import { colors } from '@/theme/tokens';

/** The reader's notes on ayat (long press on an ayah → «أضف ملاحظة»). Kept on the device only. */
export default function NotesScreen() {
  const [prefs] = usePrefs();
  const list = Object.entries(prefs.notes).filter(([k, t]) => k.startsWith('ayah:') && t.trim());
  return (
    <Screen backdrop="mint" withTabBar={false} header={<PageHeader title="الملاحظات" fallback="/quran" />}>
      {!list.length ? (
        <GlassCard style={{ alignItems: 'center', gap: 6, paddingVertical: 28 }}>
          <Icon name="note" size={26} color={colors.primary} />
          <Display size={18}>لا ملاحظات بعد</Display>
          <Caption style={{ textAlign: 'center' }}>اضغط مطوّلًا على أي آية في المصحف واختر «أضف ملاحظة».</Caption>
        </GlassCard>
      ) : (
        list.map(([id, text]) => {
          const key = id.slice(5);
          const [s, a] = key.split(':').map(Number);
          return (
            <Pressable key={id} accessibilityRole="button" onPress={() => router.push(`/note/${key}`)}>
              <GlassCard style={{ gap: 8 }}>
                <View style={styles.between}>
                  <Body size={14} weight="bold" color={colors.primary}>{`${quranIndex.surahs[s - 1]?.name ?? ''} · الآية ${ar(a)}`}</Body>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="احذف الملاحظة"
                    hitSlop={10}
                    onPress={() =>
                      setPrefs((p) => {
                        const notes = { ...p.notes };
                        delete notes[id];
                        return { notes };
                      })
                    }
                  >
                    <Icon name="close" size={18} color={colors.muted} />
                  </Pressable>
                </View>
                <MadinahAyah surah={s} ayah={a} size={18} numberOfLines={2} />
                <Body size={14} lineHeight={24} numberOfLines={4}>
                  {text}
                </Body>
              </GlassCard>
            </Pressable>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
