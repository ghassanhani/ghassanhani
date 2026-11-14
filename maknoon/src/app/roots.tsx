import { router } from 'expo-router';
import { useDeferredValue, useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Pressable } from '@/components/Tap';
import { Icon } from '@/components/Icon';
import { MadinahAyah } from '@/components/MadinahAyah';
import { PageHeader } from '@/components/PageHeader';
import { Screen } from '@/components/Screen';
import { Squircle } from '@/components/Squircle';
import { Body, Caption, Display } from '@/components/Typography';
import { Chip, GlassCard, InnerCard } from '@/components/ui';
import { ar } from '@/content/quran';
import { quranIndex } from '@/content/worship';
import { ayatOfRoot } from '@/search/engine';
import { F } from '@/theme/fonts';
import { colors } from '@/theme/tokens';

const EXAMPLES = ['ر ح م', 'ص ب ر', 'ع ل م', 'ه د ي', 'ش ك ر', 'ت و ب'];
const PAGE = 30;

/**
 * Root explorer: a root («ر ح م») or any word from it, and every ayah where its forms occur, in
 * mushaf order, with the forms found. The root comes from the app's search analyser (automatic,
 * not a reviewed dictionary), and says so.
 */
export default function RootsScreen() {
  const [q, setQ] = useState('');
  const [shown, setShown] = useState(PAGE);
  const query = useDeferredValue(q.trim());
  const found = useMemo(() => (query ? ayatOfRoot(query) : null), [query]);

  return (
    <Screen backdrop="mint" withTabBar={false} header={<PageHeader title="مستكشف الجذور" fallback="/quran" />}>
      <Squircle radius={28} fill="rgba(255,255,255,0.6)" glow="glass" style={styles.field}>
        <Icon name="search" size={20} color="#35625B" />
        <TextInput
          value={q}
          onChangeText={(t) => {
            setQ(t);
            setShown(PAGE);
          }}
          placeholder="جذر مثل «ر ح م» أو كلمة منه"
          placeholderTextColor={colors.muted}
          accessibilityLabel="ابحث عن جذر"
          style={[styles.input, { fontFamily: F.sans }]}
        />
      </Squircle>

      {!query ? (
        <GlassCard style={{ gap: 10 }}>
          <Body size={13} color="#4A4B57">
            اكتب جذرًا بحروف منفصلة أو أي كلمة منه، لترى كل مواضعه في القرآن ومشتقاته.
          </Body>
          <View style={[styles.row, { flexWrap: 'wrap', gap: 8 }]}>
            {EXAMPLES.map((e) => (
              <Pressable key={e} accessibilityRole="button" onPress={() => setQ(e)}>
                <Squircle radius={18} fill="rgba(255,255,255,0.8)" style={styles.example}>
                  <Display size={16} color={colors.primary}>
                    {e}
                  </Display>
                </Squircle>
              </Pressable>
            ))}
          </View>
        </GlassCard>
      ) : !found ? (
        <GlassCard>
          <Body size={14} color="#4A4B57">
            لم يُعثر على هذا الجذر. جرّب كتابته بحروف منفصلة، مثل «ع ل م».
          </Body>
        </GlassCard>
      ) : (
        <>
          <GlassCard style={{ gap: 10 }}>
            <View style={[styles.row, { justifyContent: 'space-between' }]}>
              <Display size={26}>{found.info.letters}</Display>
              <Chip label="تحليل آلي" tone="suggested" />
            </View>
            <Caption>{`${ar(found.keys.length)} آية`}</Caption>
            <View style={[styles.row, { flexWrap: 'wrap', gap: 6 }]}>
              {found.info.forms.map((w) => (
                <InnerCard key={w} style={styles.form}>
                  <Body size={14} weight="medium" color={colors.primary}>
                    {w}
                  </Body>
                </InnerCard>
              ))}
            </View>
            <Caption>المشتقات وجمع المواضع من محلّل البحث في التطبيق، لا من معجم مُراجَع.</Caption>
          </GlassCard>
          {found.keys.slice(0, shown).map((key) => {
            const [s, a] = key.split(':').map(Number);
            return (
              <Pressable key={key} accessibilityRole="link" onPress={() => router.push(`/ayah/${key}`)}>
                <GlassCard style={{ gap: 6 }}>
                  <Caption color={colors.primary}>{`${quranIndex.surahs[s - 1]?.name ?? ''} · الآية ${ar(a)}`}</Caption>
                  <MadinahAyah surah={s} ayah={a} size={19} />
                </GlassCard>
              </Pressable>
            );
          })}
          {found.keys.length > shown ? (
            <Pressable accessibilityRole="button" onPress={() => setShown((n) => n + PAGE)}>
              <Body size={14} weight="bold" color={colors.primary} style={{ textAlign: 'center', paddingVertical: 8 }}>
                {`عرض المزيد (${ar(found.keys.length - shown)})`}
              </Body>
            </Pressable>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  field: { height: 52, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  input: { flex: 1, minWidth: 0, fontSize: 15, color: colors.ink, textAlign: 'right', paddingVertical: 0 },
  example: { paddingHorizontal: 14, paddingVertical: 8 },
  form: { paddingVertical: 6, paddingHorizontal: 10 },
});
