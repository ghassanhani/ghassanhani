import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { LinkRow } from '@/components/blocks';
import { PageHeader } from '@/components/PageHeader';
import { Screen } from '@/components/Screen';
import { AyahText, Body, Caption, Display } from '@/components/Typography';
import { Chip, GlassCard, HeroCard, IconBubble, InnerCard, RoundButton, PendingChip, SampleBanner } from '@/components/ui';
import { topic as T } from '@/content/modules';
import { F } from '@/theme/fonts';
import { colors, space } from '@/theme/tokens';
import { usePrefs } from '@/store/prefs';

export default function TopicScreen() {
  const [prefs, setPrefs] = usePrefs();
  const note = prefs.notes['topic:sabr'] ?? ''; // saved on this device only
  const setNote = (t: string) => setPrefs((p) => ({ notes: { ...p.notes, 'topic:sabr': t } }));
  return (
    <Screen backdrop="mint" withTabBar={false} header={<PageHeader title={T.title} action={<RoundButton icon="bookmark" label="حفظ" size={40} iconSize={18} />} />}>
      <SampleBanner />
      <HeroCard hero="teal" style={{ gap: 6 }}>
        <Body size={13} weight="medium" color={colors.gold}>
          {T.hero.label}
        </Body>
        <Display size={40} color={colors.white} lineHeight={56}>
          {T.hero.title}
        </Display>
        <Body size={13} color="rgba(255,255,255,0.9)" lineHeight={22}>
          {T.hero.body}
        </Body>
        <View style={[styles.row, { gap: 6, flexWrap: 'wrap', marginTop: 6 }]}>
          {T.hero.counts.map((c) => (
            <View key={c} style={styles.count}>
              <Body size={12} weight="medium" color={colors.white} lineHeight={16}>
                {c}
              </Body>
            </View>
          ))}
        </View>
      </HeroCard>

      <GlassCard style={{ gap: 10 }}>
        <Display size={21.5}>{T.quran.title}</Display>
        {T.quran.items.map((q) => (
          <LinkRow key={q.text} route={q.route}>
            {q.quran ? (
              <AyahText size={22} lineHeight={42} style={{ textAlign: 'center' }}>
                {q.text}
              </AyahText>
            ) : (
              <Body size={15}>{q.text}</Body>
            )}
            <View style={[styles.row, { justifyContent: 'space-between' }]}>
              <Caption>{q.ref}</Caption>
              <PendingChip />
            </View>
          </LinkRow>
        ))}
      </GlassCard>

      <GlassCard style={{ gap: 10 }}>
        <Display size={21.5}>{T.sunnah.title}</Display>
        {T.sunnah.items.map((h) => (
          <InnerCard key={h.text} style={{ gap: 6 }}>
            <Display size={17} lineHeight={30}>
              {h.text}
            </Display>
            <View style={[styles.row, { gap: 8 }]}>
              <Chip label={`${h.chip} · بانتظار المراجعة`} tone="pending" />
              <Caption>{h.ref}</Caption>
            </View>
          </InnerCard>
        ))}
      </GlassCard>

      <GlassCard style={{ gap: 10 }}>
        <Display size={21.5}>{T.scholars.title}</Display>
        {T.scholars.items.map((s) => (
          <InnerCard key={s.book} style={{ gap: 4 }}>
            <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'flex-start' }]}>
              <View>
                <Display size={16}>{s.book}</Display>
                <Caption>{s.author}</Caption>
              </View>
              <PendingChip />
            </View>
            <Body size={14}>{s.excerpt}</Body>
            <Caption>{s.ref}</Caption>
          </InnerCard>
        ))}
      </GlassCard>

      <GlassCard style={{ gap: 10 }}>
        <View style={[styles.row, { gap: 10 }]}>
          <IconBubble name="note" size={34} iconSize={16} color="#B8975A" />
          <Display size={20}>{T.reflect.title}</Display>
        </View>
        <Body size={14} color="#4A4B57" lineHeight={24}>
          {T.reflect.prompt}
        </Body>
        <InnerCard>
          <TextInput
            value={note}
            onChangeText={setNote}
            multiline
            placeholder={T.reflect.placeholder}
            placeholderTextColor={colors.muted}
            accessibilityLabel={T.reflect.title}
            style={[styles.note, { fontFamily: F.sans }]}
          />
        </InnerCard>
      </GlassCard>

      <Display size={21.5}>{T.relatedTitle}</Display>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rail} contentContainerStyle={styles.railContent}>
        {T.related.map((r) => (
          <GlassCard key={r} style={styles.related}>
            <Display size={18}>{r}</Display>
          </GlassCard>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  count: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14, borderCurve: 'continuous', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', backgroundColor: 'rgba(255,255,255,0.12)' },
  note: { minHeight: 90, fontSize: 15, color: colors.ink, textAlignVertical: 'top', textAlign: 'right' },
  rail: { marginHorizontal: -space.gutter, flexGrow: 0 },
  railContent: { paddingHorizontal: space.gutter, gap: 9 },
  related: { width: 112, height: 80, padding: 14, justifyContent: 'flex-end' },
});
