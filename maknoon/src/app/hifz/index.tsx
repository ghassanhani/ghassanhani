import { router } from 'expo-router';
import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';
import { PageHeader } from '@/components/PageHeader';
import { Screen } from '@/components/Screen';
import { Squircle } from '@/components/Squircle';
import { Body, Caption, Display } from '@/components/Typography';
import { Cta, GlassCard, HeroCard, IconBubble, InnerCard, ProgressBar, Segmented, SoftButton, Switch } from '@/components/ui';
import { ar } from '@/content/quran';
import { hifz as H } from '@/content/worship';
import { colors } from '@/theme/tokens';
import { usePrefs } from '@/store/prefs';

type Lock = 'shown' | 'paused' | 'dismissed';

export default function HifzScreen() {
  const [prefs, setPrefs] = usePrefs();
  const lock = prefs.hifzLock;
  const setLock = (v: Lock) => setPrefs({ hifzLock: v });
  const pace = prefs.hifzPace;
  const setPace = (v: number) => setPrefs({ hifzPace: v });
  const slots = prefs.hifzSlots;
  const setSlots = (f: (a: boolean[]) => boolean[]) => setPrefs((p) => ({ hifzSlots: f(p.hifzSlots) }));

  const months = Math.round(H.pace.remainingPages / pace / 30.4);
  const paceResult = months >= 24 ? `نحو ${ar(Math.round((months / 12) * 10) / 10)} سنوات` : `نحو ${ar(months)} شهرًا`;

  return (
    <Screen backdrop="mint" withTabBar={false} header={<PageHeader title={H.title} fallback="/quran" />}>
      <HeroCard hero="teal" style={{ gap: 4 }}>
        <Body size={14} weight="medium" color={colors.gold}>
          {H.progress.label}
        </Body>
        <Display size={40} color={colors.white} lineHeight={56}>
          {H.progress.title}
        </Display>
        <Body size={13} color={colors.white}>
          {H.progress.meta}
        </Body>
        <View style={{ marginVertical: 14 }}>
          {/* 41 of 604 pages (juz 30 + part of 29) as drawn */}
          <ProgressBar value={(604 - H.pace.remainingPages) / 604} fill="#26CCDB" track="#FFFFFF" />
        </View>
        <Caption color="rgba(255,255,255,0.75)">{H.progress.mushaf}</Caption>
      </HeroCard>

      <GlassCard style={{ gap: 4 }}>
        <View style={[styles.between, { alignItems: 'center', marginBottom: 6 }]}>
          <Display size={22}>{H.plan.title}</Display>
          <Caption>{H.plan.sub}</Caption>
        </View>
        {H.plan.tracks.map((t, i) => (
          <View key={t.tag} style={[styles.row, { gap: 12, paddingVertical: 12 }, i > 0 && styles.sep]}>
            <Squircle radius={13} fill={colors.primary} glow="button" style={styles.tag}>
              <Body size={12} weight="bold" color={colors.white} lineHeight={16}>
                {t.tag}
              </Body>
            </Squircle>
            <View style={{ flex: 1 }}>
              <Body size={16} lineHeight={24}>
                <Body size={16} weight="bold">
                  {t.title}
                </Body>
                <Caption>{` · ${t.when}`}</Caption>
              </Body>
              <Body size={13} color={colors.primary}>
                {t.what}
              </Body>
            </View>
            <Body size={14} weight="bold">
              {t.amount}
            </Body>
          </View>
        ))}
        <View style={[styles.row, { gap: 10, marginTop: 10 }]}>
          <Cta label={H.plan.start} style={{ flex: 1 }} onPress={() => router.push('/hifz/session')} />
          <SoftButton label={H.plan.review} style={{ flex: 1 }} />
        </View>
      </GlassCard>

      {lock === 'shown' ? (
        <GlassCard style={{ gap: 10 }}>
          <View style={[styles.row, { gap: 10 }]}>
            <IconBubble name="list" size={34} iconSize={16} color="#DA753A" />
            <Display size={18}>{H.lock.title}</Display>
          </View>
          <Body size={14} color="#4A4B57" lineHeight={24}>
            {H.lock.body}
          </Body>
          <View style={[styles.row, { gap: 10 }]}>
            <Cta label={H.lock.pause} style={{ flex: 1 }} onPress={() => setLock('paused')} />
            <SoftButton label={H.lock.dismiss} style={{ flex: 1 }} onPress={() => setLock('dismissed')} />
          </View>
        </GlassCard>
      ) : (
        <Squircle radius={24} fill="rgba(255,255,255,0.6)" stroke="#FFFFFF" style={{ padding: 16 }}>
          <Body size={13} color="#4A4B57">
            {lock === 'paused' ? H.lock.paused : H.lock.dismissed}
          </Body>
        </Squircle>
      )}

      <GlassCard style={{ gap: 12 }}>
        <Display size={22}>{H.map.title}</Display>
        <View style={styles.juzGrid}>
          {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => {
            const st = n === 30 ? 'done' : n === 29 ? 'part' : 'none';
            return (
              <View key={n} style={[styles.juz, st === 'done' ? { backgroundColor: colors.primary } : st === 'part' ? { backgroundColor: colors.sky } : { backgroundColor: colors.white }]}>
                <Body size={12} weight="bold" lineHeight={16} color={st === 'none' ? '#A3A4AF' : colors.white}>
                  {ar(n)}
                </Body>
              </View>
            );
          })}
        </View>
        <View style={[styles.row, { gap: 14 }]}>
          {H.map.legend.map((l, i) => (
            <View key={l} style={[styles.row, { gap: 6 }]}>
              <View style={[styles.legend, { backgroundColor: [colors.primary, colors.sky, colors.white][i] }]} />
              <Caption>{l}</Caption>
            </View>
          ))}
        </View>
      </GlassCard>

      <GlassCard style={{ gap: 12 }}>
        <Display size={22}>{H.pace.title}</Display>
        <Segmented options={H.pace.options.map((o) => ({ value: o.v, label: o.label }))} value={pace} onChange={setPace} />
        <View style={[styles.row, { gap: 12 }]}>
          <Display size={30} color={colors.primary} lineHeight={42}>
            {paceResult}
          </Display>
          <Caption style={{ flex: 1 }}>{H.pace.resultSub}</Caption>
        </View>
        <Caption>{H.pace.note}</Caption>
      </GlassCard>

      <GlassCard style={{ gap: 10 }}>
        <Display size={22}>{H.weak.title}</Display>
        {H.weak.items.map((w) => (
          <InnerCard key={w.title} style={[styles.row, { gap: 10 }]}>
            <View style={{ flex: 1 }}>
              <Display size={15}>{w.title}</Display>
              <Caption>{w.meta}</Caption>
            </View>
            <Cta label={H.weak.cta} height={38} compact onPress={() => router.push('/hifz/session')} />
          </InnerCard>
        ))}
        <Caption>{H.weak.note}</Caption>
      </GlassCard>

      <View style={[styles.row, { gap: 12, alignItems: 'stretch' }]}>
        <GlassCard style={{ flex: 1, gap: 6, padding: 16 }}>
          <Display size={16}>{H.mutashabihat.title}</Display>
          <Caption>{H.mutashabihat.meta}</Caption>
          <Cta label={H.mutashabihat.cta} height={38} compact style={{ marginTop: 'auto' }} />
        </GlassCard>
        <GlassCard style={{ flex: 1, gap: 6, padding: 16 }}>
          <Display size={16}>{H.teacher.title}</Display>
          <Caption>{H.teacher.meta}</Caption>
          <Cta label={H.teacher.cta} height={38} compact style={{ marginTop: 'auto' }} />
        </GlassCard>
      </View>
      <Caption style={{ paddingHorizontal: 6 }}>{H.teacher.note}</Caption>

      <GlassCard style={{ gap: 2 }}>
        <Display size={22} style={{ marginBottom: 6 }}>
          {H.slots.title}
        </Display>
        {H.slots.items.map((s, i) => (
          <Fragment key={s.title}>
            <View style={[styles.row, { gap: 12, minHeight: 60 }, i > 0 && styles.sep]}>
              <View style={{ flex: 1 }}>
                <Body size={15} weight="medium">
                  {s.title}
                </Body>
                <Caption>{s.sub}</Caption>
              </View>
              <Switch label={s.title} value={slots[i]} onChange={(v) => setSlots((a) => a.map((x, j) => (j === i ? v : x)))} />
            </View>
          </Fragment>
        ))}
        <Caption style={{ marginTop: 6 }}>{H.slots.note}</Caption>
      </GlassCard>

      <GlassCard style={{ gap: 8 }}>
        <Display size={18}>{H.later.title}</Display>
        {H.later.items.map((l) => (
          <View key={l.title} style={styles.between}>
            <Body size={14} weight="medium">
              {l.title}
            </Body>
            <Caption>{l.meta}</Caption>
          </View>
        ))}
      </GlassCard>

      <Caption style={{ textAlign: 'center' }}>{H.privacy}</Caption>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  sep: { borderTopWidth: 1, borderTopColor: colors.hairline },
  tag: { minWidth: 44, height: 26, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  juzGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  juz: { width: '15.2%', height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  legend: { width: 12, height: 12, borderRadius: 4, borderWidth: 1, borderColor: colors.ring },
});
