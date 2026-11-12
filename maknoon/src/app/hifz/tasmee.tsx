import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import plain from '../../../assets/content/quran-search.json';
import { Icon } from '@/components/Icon';
import { PageHeader } from '@/components/PageHeader';
import { Screen } from '@/components/Screen';
import { AyahText, Body, Caption, Display } from '@/components/Typography';
import { Chip, Cta, GlassCard, InnerCard, SoftButton } from '@/components/ui';
import { ar, getAyah } from '@/content/quran';
import { hifzSession as S, quranIndex } from '@/content/worship';
import { type Listening, listeningSupported, startListening } from '@/recitation/listen';
import { type ExpectedAyah, type Flag, type Result, check, prompt } from '@/recitation/match';
import { modelStatus } from '@/recitation/model';
import { usePrefs } from '@/store/prefs';
import { colors } from '@/theme/tokens';

const PLAIN = plain as Record<string, string>;
type Phase = 'idle' | 'starting' | 'listening' | 'checking' | 'done';

/**
 * Recitation check — تسميع (SPEC §2.12, experimental). The reciter recites the portion
 * from memory with the ayat hidden; when they finish, the words the on-device model heard
 * are matched to the expected ayat and only clear differences are pointed out.
 * Audio is processed on the device, kept in memory and dropped. Tajweed is out of scope.
 */
export default function TasmeeScreen() {
  usePrefs(); // re-render when the model pack is installed or removed
  const [phase, setPhase] = useState<Phase>('idle');
  const [words, setWords] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const session = useRef<Listening | null>(null);

  const [from, to] = S.ayat;
  const keys = Array.from({ length: to - from + 1 }, (_, i) => `${S.surah}:${from + i}`);
  const expected: ExpectedAyah[] = keys.map((key) => ({ key, text: PLAIN[key] }));
  const status = listeningSupported ? modelStatus() : 'unsupported';

  // Leaving the screen stops the microphone and throws away whatever was captured.
  useEffect(() => () => void session.current?.cancel().catch(() => {}), []);

  const start = async () => {
    setError(null);
    setResult(null);
    setWords(0);
    setPhase('starting');
    try {
      session.current = await startListening(setWords);
      setPhase('listening');
    } catch {
      setError('تعذّر تشغيل الميكروفون. تحقق من إذن الميكروفون في إعدادات الجهاز.');
      setPhase('idle');
    }
  };
  const finish = async () => {
    if (!session.current) return;
    setPhase('checking');
    try {
      const heard = await session.current.stop();
      session.current = null;
      setResult(check(expected, heard, { finished: true }));
      setPhase('done');
    } catch {
      session.current = null;
      setError('تعذّر إتمام التسميع. حاول مرة أخرى.');
      setPhase('idle');
    }
  };

  // Design preview where no microphone runtime exists: a "recitation" made by script from the
  // portion's own text (second ayah loses a word, fourth ayah is skipped). Nothing is recorded.
  const preview = () => {
    const heard = expected
      .map((e, i) => {
        const w = e.text.split(/\s+/);
        return i === 3 ? '' : i === 1 ? [...w.slice(0, 2), ...w.slice(3)].join(' ') : e.text;
      })
      .join(' ');
    setResult(check(expected, heard, { finished: true }));
    setPhase('done');
  };

  return (
    <Screen backdrop="mint" withTabBar={false} header={<PageHeader title={S.tasmee.title} fallback="/hifz/session" />}>
      <GlassCard soft style={{ gap: 8 }}>
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <Display size={18}>{`${S.head.surah} · ${S.head.range}`}</Display>
          <Chip label="تجريبي" tone="pending" />
        </View>
        <Body size={13} color="#4A4B57" lineHeight={22}>
          يستمع التطبيق إلى تلاوتك من حفظك وينبّهك إلى كلمة سقطت أو تغيّرت أو آية تُخطّيت. قد يخطئ السمع، فالتنبيه دعوة إلى التأكد لا حكمٌ بالخطأ. لا يقيّم التجويد، ولا يغني عن التسميع على معلّم.
        </Body>
        <View style={[styles.row, { gap: 8 }]}>
          <Icon name="badge" size={16} color={colors.primary} />
          <Caption style={{ flex: 1 }}>يُعالَج الصوت على جهازك ولا يُحفظ ولا يُرسل.</Caption>
        </View>
      </GlassCard>

      {status === 'unsupported' ? (
        <GlassCard style={{ gap: 10 }}>
          <Body size={14}>التسميع متاح في تطبيق iOS وAndroid فقط.</Body>
          <SoftButton label="معاينة شاشة النتيجة" onPress={preview} />
          <Caption>المعاينة لا تستمع: تُصنع آليًا من نص المقطع بإسقاط كلمة وتخطّي آية، لعرض شكل التنبيهات فقط.</Caption>
        </GlassCard>
      ) : status === 'unavailable' ? (
        <Notice text="نموذج التسميع لم يُنشر بعد. ستظهر هنا إمكانية تنزيله عند توفّره." />
      ) : status === 'missing' ? (
        <GlassCard style={{ gap: 10 }}>
          <Body size={14}>يحتاج التسميع إلى تنزيل نموذج الاستماع مرة واحدة ليعمل دون اتصال.</Body>
          <SoftButton label="نزّله من الإعدادات" onPress={() => router.push('/settings')} />
        </GlassCard>
      ) : phase === 'idle' || phase === 'starting' ? (
        <GlassCard style={{ gap: 12, alignItems: 'center' }}>
          <Icon name="mic" size={32} color={colors.primary} />
          <Body size={14} style={{ textAlign: 'center' }}>
            {S.repeat.hidden}
          </Body>
          {phase === 'starting' ? <ActivityIndicator color={colors.primary} /> : <Cta label={S.tasmee.cta} onPress={start} style={{ alignSelf: 'stretch' }} />}
          {error ? <Caption color={colors.pendingInk}>{error}</Caption> : null}
        </GlassCard>
      ) : phase === 'listening' || phase === 'checking' ? (
        <GlassCard style={{ gap: 12, alignItems: 'center' }}>
          <Icon name="mic" size={32} color={colors.primary} />
          <Display size={20}>{phase === 'listening' ? 'أستمع…' : 'أراجع ما سمعت…'}</Display>
          <Caption>{`الآيات مخفية · سُمعت ${ar(words)} كلمة`}</Caption>
          {phase === 'listening' ? <Cta label="أنهيت التلاوة" onPress={finish} style={{ alignSelf: 'stretch' }} /> : <ActivityIndicator color={colors.primary} />}
        </GlassCard>
      ) : null}

      {phase === 'done' && result ? (
        <>
          <GlassCard tint={result.flags.length ? 'peach' : 'mint'} style={{ gap: 6 }}>
            <Display size={20}>{result.flags.length ? `${ar(result.flags.length)} ${result.flags.length === 1 ? 'موضع يحتاج' : 'مواضع تحتاج'} إلى تأكد` : 'لم ألحظ فرقًا'}</Display>
            <Caption>{`طابقتُ ${ar(result.matched)} من ${ar(result.expected)} كلمة${result.extra ? ` · ${ar(result.extra)} كلمة مكرّرة أو زائدة لم تُحسب` : ''}`}</Caption>
          </GlassCard>
          {keys.map((key) => (
            <AyahResult key={key} ayahKey={key} flags={result.flags.filter((f) => f.ayah === key)} />
          ))}
          <Cta label="سمّع مرة أخرى" onPress={start} />
        </>
      ) : null}
    </Screen>
  );
}

function Notice({ text }: { text: string }) {
  return (
    <GlassCard>
      <Body size={14}>{text}</Body>
    </GlassCard>
  );
}

/** The canonical ayah with the words to re-check marked. The text itself is never changed. */
function AyahResult({ ayahKey, flags }: { ayahKey: string; flags: Flag[] }) {
  const [s, a] = ayahKey.split(':').map(Number);
  const ayah = getAyah(s, a);
  if (!ayah) return null;
  const skipped = flags.some((f) => f.kind === 'skipped-ayah');
  const marked = new Set(flags.flatMap((f) => (f.kind === 'skipped-ayah' ? [] : [f.word])));
  // Split on spaces but keep them, so the pieces put back together are the exact source text.
  const parts = ayah.text.split(/([\s ]+)/);
  const isWord = (p: string) => /[ء-ي]/.test(p);
  // Word positions come from the search spelling; mark words only where both spellings split alike.
  const aligned = parts.filter(isWord).length === PLAIN[ayahKey].split(/\s+/).filter(Boolean).length;
  let w = -1;
  return (
    <InnerCard style={{ gap: 8 }} selected={skipped}>
      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <Caption>{`${quranIndex.surahs[s - 1]?.name ?? ''} · ${ar(a)}`}</Caption>
        {flags.length ? <Chip label={prompt(flags[0])} tone="pending" /> : <Icon name="badge" size={16} color={colors.primary} />}
      </View>
      <AyahText size={22} lineHeight={44} style={{ fontFamily: ayah.fontFamily }}>
        {parts.map((p, i) => {
          if (isWord(p)) w++;
          const on = aligned && isWord(p) && marked.has(w);
          return (
            <Text key={i} style={on ? styles.mark : null}>
              {p}
            </Text>
          );
        })}
      </AyahText>
      {!aligned && marked.size ? <Caption>{`الكلمة ${[...marked].map((i) => ar(i + 1)).join('، ')} من الآية`}</Caption> : null}
    </InnerCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  // Marked without relying on red/green: a warm highlight plus an underline.
  mark: { backgroundColor: '#F3E2B9', textDecorationLine: 'underline', textDecorationColor: colors.pendingInk },
});
