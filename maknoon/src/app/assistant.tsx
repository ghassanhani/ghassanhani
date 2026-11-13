import { router } from 'expo-router';
import { type ComponentRef, useRef, useState } from 'react';
import { type ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Pressable } from '@/components/Tap';
import type { Node } from '@/assistant/corpus';
import { ask, type Answer } from '@/assistant/engine';
import { Icon } from '@/components/Icon';
import { PageHeader } from '@/components/PageHeader';
import { Screen } from '@/components/Screen';
import { Squircle } from '@/components/Squircle';
import { AyahText, Body, Caption, Display } from '@/components/Typography';
import { Chip, GlassCard, InnerCard } from '@/components/ui';
import { assistant as A } from '@/content/account';
import { ar, getAyah } from '@/content/quran';
import { F } from '@/theme/fonts';
import { APP_NAME } from '@/config';
import { TypingDots } from '@/components/motion';
import { colors } from '@/theme/tokens';

type Turn = { q: string; answer: Answer | null };

/**
 * Retrieval-only assistant (plan §8). Answers are cards from the app's own texts,
 * rendered verbatim with source + review status; personal rulings are refused.
 * No text is generated (CLAUDE.md: no language-model answers).
 */
export default function AssistantScreen() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);

  const submit = async (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    setInput('');
    setBusy(true);
    setTurns((t) => [...t, { q: question, answer: null }]);
    const answer = await ask(question);
    setTurns((t) => t.map((x, i) => (i === t.length - 1 ? { ...x, answer } : x)));
    setBusy(false);
  };

  return (
    <Screen
      backdrop="mist"
      withTabBar={false}
      header={<PageHeader title={A.title} fallback="/search" />}
      scrollRef={scroll}
      // keep the latest question and answer in view
      onContentSizeChange={() => turns.length && scroll.current?.scrollToEnd({ animated: true })}
      footer={
        <>
          <Squircle radius={30} fill="rgba(255,255,255,0.7)" glow="glass" style={styles.input}>
            <TextInput
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => submit(input)}
              returnKeyType="send"
              placeholder={A.inputLabel}
              placeholderTextColor={colors.muted}
              accessibilityLabel={A.inputLabel}
              style={[styles.field, { fontFamily: F.sans }]}
            />
            <Pressable accessibilityRole="button" accessibilityLabel="أرسل" onPress={() => submit(input)} disabled={busy}>
              <Squircle radius={22} fill={colors.primary} glow="button" style={styles.send}>
                <Icon name="arrowLeft" size={20} color={colors.white} />
              </Squircle>
            </Pressable>
          </Squircle>
          <Caption style={{ textAlign: 'center', marginTop: 6 }}>{`بحث في نصوص ${APP_NAME} يعرض المصادر كما هي · لا يُولَّد أي نص`}</Caption>
        </>
      }
    >
      <GlassCard soft style={{ gap: 6 }}>
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <Display size={17}>{A.banner.title}</Display>
          <Chip label={A.banner.beta} tone="pending" />
        </View>
        <Body size={13} color="#4A4B57" lineHeight={22}>
          {A.banner.body}
        </Body>
      </GlassCard>

      {!turns.length ? (
        <View style={[styles.row, { gap: 8, flexWrap: 'wrap' }]}>
          {[A.q1, A.q2, 'الصبر', 'أذكار الصباح والمساء'].map((s) => (
            <Pressable key={s} accessibilityRole="button" onPress={() => submit(s)}>
              <Squircle radius={20} fill="rgba(255,255,255,0.7)" glow="glass" stroke="#FFFFFF" style={styles.suggest}>
                <Body size={13} weight="medium" color={colors.primary}>
                  {s}
                </Body>
              </Squircle>
            </Pressable>
          ))}
        </View>
      ) : null}

      {turns.map((t, i) => (
        <View key={i} style={{ gap: 12 }}>
          <Squircle radius={22} fill={colors.primary} glow="button" style={styles.bubble}>
            <Body size={15} weight="medium" color={colors.white}>
              {t.q}
            </Body>
          </Squircle>
          {t.answer ? <AnswerCard answer={t.answer} /> : <TypingDots color={colors.primary} />}
        </View>
      ))}
    </Screen>
  );
}

function AnswerCard({ answer }: { answer: Answer }) {
  if (answer.kind === 'ruling') {
    return (
      <GlassCard style={{ gap: 10 }}>
        <Chip label={A.a2.flag} tone="pending" />
        <Body size={14} color="#4A4B57" lineHeight={24}>
          لا يصدر المساعد فتوى.
          {answer.fiqh.length ? ` هذه المسائل ذات الصلة في ${APP_NAME}، بأقوال المذاهب وأدلتها:` : ` لا توجد بعد في ${APP_NAME} مسألة مُراجَعة لهذا السؤال.`}
        </Body>
        {answer.fiqh.map((n) => (
          <SourceCard key={n.id} n={n} />
        ))}
        <Display size={16}>{A.a2.consultTitle}</Display>
        <Caption>حالتك ومذهبك وظروفك تؤثر في الجواب.</Caption>
      </GlassCard>
    );
  }
  if (answer.kind === 'scope' || answer.kind === 'empty') {
    return (
      <GlassCard style={{ gap: 6 }}>
        <Body size={14} color="#4A4B57" lineHeight={24}>
          {answer.kind === 'scope'
            ? 'هذا السؤال خارج نطاق المساعد. للمسائل الحسّاسة أو الشخصية ارجع إلى عالم موثوق، وفي الحالات الطارئة اتصل بخدمات الطوارئ.'
            : `لم أجد في نصوص ${APP_NAME} ما يطابق سؤالك. جرّب كلمات أخرى، أو ابحث من شاشة «ابحث».`}
        </Body>
      </GlassCard>
    );
  }
  const all = [...answer.nodes, ...answer.tafsir];
  return (
    <GlassCard style={{ gap: 10 }}>
      <Body size={14} color="#4A4B57">
        {`وجدتُ ${ar(all.length)} من نصوص ${APP_NAME}:`}
      </Body>
      {all.map((n, i) => (
        <SourceCard key={n.id} n={n} num={i + 1} />
      ))}
      <View style={styles.hairline} />
      <Caption>المصادر تُعرض كما هي في قاعدة البيانات، بعلامة حالة مراجعتها.</Caption>
    </GlassCard>
  );
}

function SourceCard({ n, num }: { n: Node; num?: number }) {
  const ayah = n.kind === 'ayah' && n.surah ? getAyah(n.surah, n.ayah!) : null;
  const tone = n.tone ?? (n.kind === 'ayah' ? null : 'suggested');
  const body = (
    <InnerCard style={{ gap: 6 }}>
      <View style={[styles.row, { gap: 8, flexWrap: 'wrap' }]}>
        {num ? (
          <Body size={12} weight="bold" color={colors.primary}>
            {`${ar(num)} ·`}
          </Body>
        ) : null}
        <Display size={15} style={{ flexShrink: 1 }}>
          {n.title}
        </Display>
        {tone ? (
          <Chip
            label={n.chip ?? (tone === 'reviewed' ? 'مُراجَع' : tone === 'pending' ? 'بانتظار المراجعة' : 'مقترح')}
            tone={tone}
            badge={tone === 'reviewed'}
          />
        ) : null}
      </View>
      {ayah ? (
        <AyahText size={20} lineHeight={38} style={{ fontFamily: ayah.fontFamily }}>
          {ayah.text}
        </AyahText>
      ) : n.text ? (
        <Display size={16} lineHeight={28}>
          {n.text}
        </Display>
      ) : null}
      <Caption>{n.kind === 'tafsir' && n.surah ? `${n.ref} · المختصر في التفسير` : n.ref}</Caption>
    </InnerCard>
  );
  return n.route ? (
    <Pressable accessibilityRole="link" onPress={() => router.push(n.route as never)}>
      {body}
    </Pressable>
  ) : (
    body
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  hairline: { height: 1, backgroundColor: colors.hairline },
  suggest: { paddingVertical: 10, paddingHorizontal: 14 },
  bubble: {
    alignSelf: 'flex-start', // the user's question sits on the start (right) side in RTL
    maxWidth: '85%',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 60,
    paddingStart: 18,
    paddingEnd: 8,
  },
  field: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    color: colors.ink,
    textAlign: 'right',
    outlineWidth: 0,
  },
  send: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
