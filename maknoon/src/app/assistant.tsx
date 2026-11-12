import { router } from 'expo-router';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { LinkRow } from '@/components/blocks';
import { Icon } from '@/components/Icon';
import { PageHeader } from '@/components/PageHeader';
import { Screen } from '@/components/Screen';
import { Squircle } from '@/components/Squircle';
import { Body, Caption, Display } from '@/components/Typography';
import { Chip, GlassCard, InnerCard, RoundButton } from '@/components/ui';
import { assistant as A } from '@/content/account';
import { F } from '@/theme/fonts';
import { colors } from '@/theme/tokens';

/**
 * Retrieval-only assistant (plan §8). The canvas shows two sample exchanges: a
 * sourced answer, and a personal-ruling question that is refused with madhhab
 * positions + "consult a scholar". No model is connected yet, so input is disabled.
 */
export default function AssistantScreen() {
  return (
    <Screen backdrop="mist" withTabBar={false} header={<PageHeader title={A.title} fallback="/search" action={<RoundButton icon="note" label="محادثات سابقة" size={40} iconSize={18} />} />}>
      <GlassCard soft style={{ gap: 6 }}>
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <Display size={17}>{A.banner.title}</Display>
          <Chip label={A.banner.beta} tone="pending" />
        </View>
        <Body size={13} color="#4A4B57" lineHeight={22}>
          {A.banner.body}
        </Body>
      </GlassCard>

      <Bubble text={A.q1} />
      <GlassCard style={{ gap: 10 }}>
        <Line text={A.a1.lines[0].text} cite={A.a1.lines[0].cite} />
        <LinkRow route="/hadith/bukhari-8">
          <Display size={17} lineHeight={30}>
            {A.a1.card.text}
          </Display>
          <Chip label={A.a1.card.chip} tone="reviewed" badge />
          <Caption>{A.a1.card.ref}</Caption>
        </LinkRow>
        <Line text={A.a1.lines[1].text} cite={A.a1.lines[1].cite} />
        <View style={styles.hairline} />
        <Caption>{A.a1.sourcesTitle}</Caption>
        {A.a1.sources.map((s) => (
          <View key={s.text} style={[styles.row, { gap: 8 }]}>
            <Chip label={s.label} tone={s.tone} badge={s.tone === 'reviewed'} />
            <Display size={14} style={{ flex: 1 }}>
              {s.text}
            </Display>
          </View>
        ))}
      </GlassCard>

      <Bubble text={A.q2} />
      <GlassCard tint="peach" style={{ gap: 10 }}>
        <Chip label={A.a2.flag} tone="pending" />
        <Body size={14} color="#4A4B57" lineHeight={24}>
          {A.a2.intro}
        </Body>
        <InnerCard style={{ gap: 6 }}>
          <Display size={15}>{A.a2.issue}</Display>
          {A.a2.positions.map((p) => (
            <Body key={p} size={14}>
              {p}
            </Body>
          ))}
          <Pressable accessibilityRole="link" onPress={() => router.push('/fiqh')} style={[styles.row, { gap: 4 }]}>
            <Body size={13} weight="medium" color={colors.primary}>
              {A.a2.link}
            </Body>
            <Icon name="chevronLeft" size={16} color={colors.primary} />
          </Pressable>
        </InnerCard>
        <Display size={16}>{A.a2.consultTitle}</Display>
        <Caption>{A.a2.consultBody}</Caption>
      </GlassCard>

      <Squircle radius={30} fill="rgba(255,255,255,0.7)" glow="glass" style={styles.input}>
        <TextInput
          editable={false}
          placeholder={A.inputLabel}
          placeholderTextColor={colors.muted}
          accessibilityLabel={A.inputLabel}
          style={[styles.field, { fontFamily: F.sans }]}
        />
        <Squircle radius={20} fill={colors.primary} glow="button" style={styles.send}>
          <Icon name="arrowLeft" size={20} color={colors.white} />
        </Squircle>
      </Squircle>
      <Caption style={{ textAlign: 'center' }}>{A.notConnected}</Caption>
    </Screen>
  );
}

function Bubble({ text }: { text: string }) {
  return (
    <Squircle radius={22} fill={colors.primary} glow="button" style={styles.bubble}>
      <Body size={15} weight="medium" color={colors.white}>
        {text}
      </Body>
    </Squircle>
  );
}

function Line({ text, cite }: { text: string; cite: string }) {
  return (
    <Body size={15} lineHeight={26}>
      {text}
      <Body size={11} weight="bold" color={colors.primary}>{` [${cite}]`}</Body>
      {'.'}
    </Body>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  hairline: { height: 1, backgroundColor: colors.hairline },
  bubble: { alignSelf: 'flex-end', maxWidth: '85%', paddingVertical: 12, paddingHorizontal: 16 },
  input: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 60, paddingStart: 18, paddingEnd: 8 },
  field: { flex: 1, minWidth: 0, fontSize: 15, color: colors.ink, textAlign: 'right' },
  send: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
