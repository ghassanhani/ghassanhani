import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Pressable } from '@/components/Tap';
import { Icon } from '@/components/Icon';
import { MadinahAyah } from '@/components/MadinahAyah';
import { PageHeader } from '@/components/PageHeader';
import { Screen } from '@/components/Screen';
import { Body, Caption, Display } from '@/components/Typography';
import { Cta, GlassCard, InnerCard } from '@/components/ui';
import { pageOfAyah } from '@/content/qcf4';
import { ar } from '@/content/quran';
import { quranIndex } from '@/content/worship';
import { usePrefs } from '@/store/prefs';
import { colors } from '@/theme/tokens';

/**
 * «دفتر المتشابهات»: the places the recitation check caught, kept on the device. Each ayah with the
 * words to re-check (what the check heard instead, when it heard something), newest first; «تدرّب»
 * opens its page with the check running.
 */
export default function NotebookScreen() {
  const [prefs, setPrefs] = usePrefs();
  // one card per ayah, newest first
  const byAyah = new Map<string, typeof prefs.slips>();
  for (const s of [...prefs.slips].sort((a, b) => b.at - a.at)) (byAyah.get(s.key) ?? byAyah.set(s.key, []).get(s.key)!).push(s);
  const cards = [...byAyah.entries()];
  const forget = (key: string) => setPrefs((p) => ({ slips: p.slips.filter((s) => s.key !== key) }));

  return (
    <Screen backdrop="mint" withTabBar={false} header={<PageHeader title="دفتر المتشابهات" fallback="/quran" />}>
      <Body size={13} color="#4A4B57" lineHeight={22}>
        كل كلمة يلتقطها التسميع تُحفظ هنا على جهازك، لتعود إليها وتتدرّب عليها.
      </Body>
      {!cards.length ? (
        <GlassCard style={{ alignItems: 'center', gap: 10, paddingVertical: 28 }}>
          <Icon name="books" size={28} color={colors.primary} />
          <Body size={14} color="#4A4B57" style={{ textAlign: 'center' }}>
            لا مواضع بعد. حين يلتقط التسميع كلمة تحتاج مراجعة تظهر هنا.
          </Body>
          <Cta label="ابدأ التسميع" height={42} compact onPress={() => router.push({ pathname: '/mushaf', params: { page: String(prefs.lastPage || 1), tasmee: '1' } })} />
        </GlassCard>
      ) : (
        cards.map(([key, slips]) => {
          const [s, a] = key.split(':').map(Number);
          const page = pageOfAyah(key) ?? 1;
          return (
            <GlassCard key={key} style={{ gap: 10 }}>
              <View style={[styles.row, { justifyContent: 'space-between' }]}>
                <Display size={16}>{`${quranIndex.surahs[s - 1]?.name ?? ''} · الآية ${ar(a)}`}</Display>
                <Pressable accessibilityRole="button" accessibilityLabel="احذف من الدفتر" hitSlop={10} onPress={() => forget(key)}>
                  <Icon name="close" size={18} color={colors.muted} />
                </Pressable>
              </View>
              <MadinahAyah surah={s} ayah={a} size={19} />
              {slips.map((x) => (
                <InnerCard key={x.word} style={{ gap: 2 }}>
                  <Body size={14} weight="bold" color={colors.ink}>
                    {x.expected}
                  </Body>
                  <Caption color="#B3261E">{x.heard ? `قرأتَ: ${x.heard}` : 'فاتتك هذه الكلمة'}</Caption>
                </InnerCard>
              ))}
              <View style={[styles.row, { justifyContent: 'space-between' }]}>
                <Caption>{`ص ${ar(page)} · آخر مرة ${ar(new Date(Math.max(...slips.map((x) => x.at))).toLocaleDateString('en-GB'))}`}</Caption>
                <Cta label="تدرّب" height={38} compact onPress={() => router.push({ pathname: '/mushaf', params: { page: String(page), tasmee: '1' } })} />
              </View>
            </GlassCard>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
