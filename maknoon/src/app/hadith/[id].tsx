import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Linking, Pressable, Share, StyleSheet, View } from 'react-native';
import { PageHeader } from '@/components/PageHeader';
import { Screen } from '@/components/Screen';
import { Body, Caption, Display } from '@/components/Typography';
import { GlassCard, InnerCard, RoundButton } from '@/components/ui';
import { type Grade, gradeLabel, gradeTone, graderName, hadithIndex, hadithRef, useHadith } from '@/content/hadith';
import { stripTashkeel } from '@/content/text';
import { usePrefs } from '@/store/prefs';
import { colors } from '@/theme/tokens';

/**
 * One hadith (id «bukhari:1»): its text (matn) as the main reading, the chain (sanad) above it,
 * every grading with the scholar who gave it (CLAUDE.md rule 5), and the source with a link to the
 * same hadith on Sunnah.com. Text exactly as imported; «hide tashkeel» only changes the display.
 */
export default function HadithScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { pack, hadith: h, error } = useHadith(id);
  const [prefs] = usePrefs();
  const show = (t: string) => (prefs.hideTashkeel ? stripTashkeel(t) : t);
  const slug = (id ?? '').split(':')[0];
  const ref = h ? hadithRef(pack ?? undefined, h) : '';
  const copy = () => h && Clipboard.setStringAsync(`${h.matn}\n[${ref}]`).catch(() => undefined);
  const share = () => h && Share.share({ message: `${h.matn}\n[${ref}]` }).catch(() => undefined);

  return (
    <Screen
      backdrop="sand"
      withTabBar={false}
      header={
        <PageHeader
          title={pack?.name ?? 'الحديث'}
          fallback={`/hadith/book/${slug}`}
          action={
            h ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <RoundButton icon="copy" label="نسخ" size={40} iconSize={18} onPress={copy} />
                <RoundButton icon="share" label="مشاركة" size={40} iconSize={18} onPress={share} />
              </View>
            ) : null
          }
        />
      }
    >
      {!h ? (
        <GlassCard style={{ alignItems: 'center', paddingVertical: 30 }}>
          {error ? <Body>لم يُعثر على هذا الحديث.</Body> : <ActivityIndicator color={colors.primary} />}
        </GlassCard>
      ) : (
        <>
          <GlassCard style={{ gap: 8 }}>
            <Caption>{[pack?.books[h.b], pack?.chapters[`${h.b}.${h.c}`]].filter(Boolean).join(' · ')}</Caption>
            {h.sanad ? (
              <Body size={14} color={colors.primary} lineHeight={26} selectable>
                {show(h.sanad)}
              </Body>
            ) : null}
            <Display size={22} lineHeight={44} selectable>
              {show(h.matn)}
            </Display>
            <Body size={14} weight="bold" color={colors.muted}>
              {ref}
            </Body>
          </GlassCard>

          <GlassCard style={{ gap: 10 }}>
            <Display size={22}>الحكم على الحديث</Display>
            {h.g.length ? (
              h.g.map((g, i) => <GradeRow key={i} g={g} />)
            ) : (
              <InnerCard>
                <Body size={14} color={colors.primary}>
                  {slug === 'bukhari' || slug === 'muslim' ? 'في أحد الصحيحين، ولا يذكر المصدر حكمًا منفصلًا.' : 'لا يذكر المصدر حكمًا لهذا الحديث.'}
                </Body>
              </InnerCard>
            )}
          </GlassCard>

          <Pressable accessibilityRole="link" onPress={() => Linking.openURL(h.url).catch(() => undefined)}>
            <Caption style={{ textAlign: 'center' }}>{`المصدر: ${hadithIndex._credit} · ${hadithIndex._license} · افتح الحديث في الموقع`}</Caption>
          </Pressable>
        </>
      )}
      <Pressable accessibilityRole="link" onPress={() => router.push('/hadith')}>
        <Caption style={{ textAlign: 'center', color: colors.primary }}>كتب الحديث</Caption>
      </Pressable>
    </Screen>
  );
}

const TONE = {
  sahih: { bg: 'rgba(46,139,87,0.12)', ink: '#24774A' },
  hasan: { bg: 'rgba(3,90,95,0.10)', ink: colors.primary },
  daif: { bg: 'rgba(179,38,30,0.10)', ink: '#B3261E' },
  other: { bg: 'rgba(129,130,144,0.14)', ink: colors.ink },
} as const;

function GradeRow({ g }: { g: Grade }) {
  const t = TONE[gradeTone(g)];
  return (
    <InnerCard style={[styles.between, { alignItems: 'center' }]}>
      <Display size={15}>{graderName(g)}</Display>
      <View style={[styles.verdict, { backgroundColor: t.bg }]}>
        <Body size={13} weight="bold" color={t.ink} lineHeight={18}>
          {gradeLabel(g)}
        </Body>
      </View>
    </InnerCard>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', justifyContent: 'space-between' },
  verdict: { paddingHorizontal: 12, height: 28, borderRadius: 14, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
});
