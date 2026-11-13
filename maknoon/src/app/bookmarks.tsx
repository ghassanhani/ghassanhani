import { router } from 'expo-router';
import { MadinahAyah } from '@/components/MadinahAyah';
import { StyleSheet, View } from 'react-native';
import { Pressable } from '@/components/Tap';
import { Icon } from '@/components/Icon';
import { PageHeader } from '@/components/PageHeader';
import { Screen } from '@/components/Screen';
import { Body, Caption, Display } from '@/components/Typography';
import { GlassCard } from '@/components/ui';
import { pageOfAyah } from '@/content/qcf4';
import { ar, getAyah } from '@/content/quran';
import { quranIndex } from '@/content/worship';
import { setPrefs, usePrefs } from '@/store/prefs';
import { colors, space } from '@/theme/tokens';

/** The ayat the reader bookmarked (long press on an ayah in the mushaf), newest first. Kept on the device. */
export default function BookmarksScreen() {
  const [prefs] = usePrefs();
  const list = [...prefs.bookmarks].reverse();
  return (
    <Screen backdrop="mint" withTabBar={false} header={<PageHeader title="العلامات" fallback="/quran" />}>
      {list.length === 0 ? (
        <GlassCard style={{ alignItems: 'center', gap: 6, paddingVertical: 28 }}>
          <Icon name="bookmark" size={26} color={colors.primary} />
          <Display size={18}>لا علامات بعد</Display>
          <Caption style={{ textAlign: 'center' }}>اضغط مطوّلًا على أي آية في المصحف واختر «أضف إشارة مرجعية».</Caption>
        </GlassCard>
      ) : (
        list.map((key) => {
          const [s, a] = key.split(':').map(Number);
          const name = (quranIndex.surahs[s - 1]?.name ?? '').replace(/[ً-ْٰـ]/g, '');
          const ayah = getAyah(s, a);
          const page = pageOfAyah(key);
          return (
            <Pressable key={key} accessibilityRole="button" onPress={() => router.push({ pathname: '/mushaf', params: { page: String(page ?? 1) } })}>
              <GlassCard style={{ gap: 6 }}>
                <View style={styles.between}>
                  <Body size={14} weight="bold" color={colors.primary}>
                    {`${name} · الآية ${ar(a)}`}
                  </Body>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="أزل الإشارة المرجعية"
                    hitSlop={10}
                    onPress={() => setPrefs((p) => ({ bookmarks: p.bookmarks.filter((k) => k !== key) }))}
                  >
                    <Icon name="close" size={18} color={colors.muted} />
                  </Pressable>
                </View>
                {ayah ? (
                  <MadinahAyah surah={s} ayah={a} size={19} numberOfLines={3} />
                ) : null}
                {page ? <Caption>{`صفحة ${ar(page)}`}</Caption> : null}
              </GlassCard>
            </Pressable>
          );
        })
      )}
      <View style={{ height: space.cardPad }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
