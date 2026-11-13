import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { atStart } from '@/components/motion';
import { Screen } from '@/components/Screen';
import { Squircle } from '@/components/Squircle';
import { AyahText, Body, Caption, Display } from '@/components/Typography';
import { GlassCard, HeroCard, IconBubble, RoundButton, Segments } from '@/components/ui';
import { home } from '@/content/design';
import { ayahPlaceholder, getAyah } from '@/content/quran';
import { colors, space } from '@/theme/tokens';
import { METHODS, type MethodKey, cityByKey, fmtDuration, fmtTime, usePrayerDay } from '@/content/prayer';

import { usePrefs } from '@/store/prefs';

export default function HomeScreen() {
  const a = home.ayahOfDay;
  const ayah = getAyah(a.surah, a.ayah);
  // Live, on-device times (Adhan) for the default city.
  const [prefs] = usePrefs();
  const city = cityByKey(prefs.city);
  const pd = usePrayerDay(city, prefs.asr, (METHODS.find((m) => m.key === prefs.prayerMethod)?.key ?? city.method) as MethodKey);
  const five = pd.times.filter((t) => t.key !== 'sunrise');

  return (
    <Screen backdrop="sand">
      {/* Header: avatar + greeting (start), search + notifications (end) */}
      <View style={styles.header}>
        <View style={styles.row}>
          <Squircle radius={26.5} fill={colors.primary} glow="button" style={styles.avatar}>
            <Display size={20} color={colors.goldWarm}>
              {home.avatarLetter}
            </Display>
          </Squircle>
          <View>
            <Body size={16} color={colors.muted} lineHeight={24}>
              {home.greeting}
            </Body>
            <Display size={20} lineHeight={26}>
              {home.name}
            </Display>
          </View>
        </View>
        <View style={[styles.row, { gap: 10 }]}>
          <RoundButton icon="search" label="ابحث" onPress={() => router.navigate('/search')} />
          <View>
            <RoundButton icon="bell" label="التنبيهات" />
            <View style={styles.dot} />
          </View>
        </View>
      </View>

      {/* Next prayer */}
      <Pressable accessibilityRole="button" onPress={() => router.push('/prayer')}>
        <HeroCard hero="night" style={{ minHeight: 249, paddingTop: 30 }}>
          <View style={styles.between}>
            <View>
              <Body size={14} weight="medium" color={colors.gold}>
                {`الصلاة القادمة · ${city.name}`}
              </Body>
              <Display size={44} color={colors.white} lineHeight={64}>
                {pd.next.name}
              </Display>
              <Body size={12} color={colors.white} lineHeight={16}>
                {fmtDuration(pd.next.date.getTime() - pd.now.getTime())}
              </Body>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 14 }}>
              <Squircle radius={20} stroke="rgba(255,255,255,0.34)" strokeWidth={2} style={styles.ring}>
                <Icon name="compass" size={20} color={colors.white} />
              </Squircle>
              <Display size={44} color={colors.white} lineHeight={60}>
                {fmtTime(pd.next.date, city.tz)}
              </Display>
            </View>
          </View>
          <View style={[styles.row, { gap: 7.6, marginTop: 'auto' }]}>
            {five.map((p) => {
              const active = p.key === pd.next.key;
              return (
                <Squircle
                  key={p.key}
                  radius={12}
                  // canvas: outline-only chips (white 28%, 1pt); the next prayer is a 25% black overlay without outline
                  fill={active ? 'rgba(0,0,0,0.25)' : undefined}
                  stroke={active ? undefined : 'rgba(255,255,255,0.28)'}
                  style={styles.prayerChip}
                >
                  <Body size={11} weight="medium" color={colors.white} lineHeight={15}>
                    {p.name}
                  </Body>
                  <Body size={12} weight="bold" color={colors.white} lineHeight={16}>
                    {fmtTime(p.date, city.tz)}
                  </Body>
                </Squircle>
              );
            })}
          </View>
        </HeroCard>
      </Pressable>

      {/* Ayah of the day */}
      <Pressable accessibilityRole="button" onPress={() => router.push('/ayah/3:3')}>
        <GlassCard soft tint="neutral" style={{ minHeight: 189 }}>
          <View style={styles.between}>
            <Display size={20}>{a.title}</Display>
            <IconBubble name="play" iconSize={16} color={colors.white} fill={colors.primary} />
          </View>
          <AyahText size={21} lineHeight={38} style={[{ marginTop: 6 }, ayah && { fontFamily: ayah.fontFamily }]}>
            {ayah ? ayah.text : ayahPlaceholder(a.surahName, a.ayah)}
          </AyahText>
          <Caption style={{ marginTop: 4 }}>{a.ref}</Caption>
        </GlassCard>
      </Pressable>

      {/* Wird + adhkar */}
      <View style={[styles.row, { gap: 12, alignItems: 'stretch' }]}>
        <View style={styles.halfSlot}>
        <GlassCard soft tint="lavender" style={styles.half}>
          <View style={styles.between}>
            <Body size={14} weight="medium">
              {home.wird.label}
            </Body>
            <IconBubble name="quran2" iconSize={21} color={colors.white} fill="#4246B7" />
          </View>
          <Display size={22} style={{ marginTop: 20 }}>
            {home.wird.title}
          </Display>
          <Caption>{home.wird.meta}</Caption>
          <WirdProgress value={home.wird.progress} />
        </GlassCard>
        </View>
        <Pressable accessibilityRole="button" style={styles.halfSlot} onPress={() => router.push('/adhkar')}>
        <GlassCard soft tint="mint" style={styles.half}>
          <View style={styles.between}>
            <Body size={14} weight="medium">
              {home.adhkarCard.label}
            </Body>
            <IconBubble name="moonCloud" iconSize={21} color={colors.white} fill="#0D8E14" />
          </View>
          <Display size={22} style={{ marginTop: 20 }}>
            {home.adhkarCard.title}
          </Display>
          <Caption>{home.adhkarCard.meta}</Caption>
          <View style={[styles.row, { gap: 4, marginTop: 'auto' }]}>
            <Display size={14} color="#141B34">
              {home.adhkarCard.cta}
            </Display>
            <Icon name="arrowLeft" size={20} color="#141B34" outline />
          </View>
        </GlassCard>
        </Pressable>
      </View>

      {/* Hifz review */}
      <Pressable accessibilityRole="button" onPress={() => router.push('/hifz')}>
      <GlassCard soft tint="peach" style={{ minHeight: 139 }}>
        <View style={styles.between}>
          <Body size={15} weight="medium">
            {home.hifzReview.label}
          </Body>
          <IconBubble name="mic" iconSize={24} color={colors.white} fill="#DA753A" />
        </View>
        <Display size={22}>{home.hifzReview.title}</Display>
        <View style={[styles.row, { gap: 8, marginTop: 10 }]}>
          {home.hifzReview.surahs.map((s) => (
            <Squircle key={s} radius={12.5} fill="rgba(129,130,144,0.12)" style={styles.smallChip}>
              <Body size={12} color={colors.muted} lineHeight={16}>
                {s}
              </Body>
            </Squircle>
          ))}
        </View>
      </GlassCard>
      </Pressable>

      {/* Adhkar rail */}
      <Display size={20}>الأذكار</Display>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rail} contentContainerStyle={styles.railContent}>
        {home.adhkarRail.map((d, i) => (
          <Pressable key={i} accessibilityRole="button" onPress={() => router.push('/adhkar')}>
            <MiniCard title={d.title} icon={d.icon} />
          </Pressable>
        ))}
      </ScrollView>

      {/* Learn */}
      <Display size={20}>تعلّم</Display>
      <Pressable accessibilityRole="link" onPress={() => router.push('/path')}>
      <GlassCard soft tint="neutral" style={{ minHeight: 174 }}>
        <View style={styles.between}>
          <Body size={12} weight="medium">
            {home.learn.label}
          </Body>
          <IconBubble name="books" iconSize={24} color={colors.white} fill="#3AAADA" />
        </View>
        <Display size={20}>{home.learn.title}</Display>
        <View style={{ marginVertical: 14 }}>
          <Segments segments={home.learn.segments} />
        </View>
        <Caption>{home.learn.next}</Caption>
      </GlassCard>
      </Pressable>

      {/* Topic of the week */}
      <Pressable accessibilityRole="link" onPress={() => router.push('/topic')}>
      <HeroCard hero="forest" style={{ minHeight: 139 }}>
        <View style={styles.between}>
          <Body size={12} weight="medium" color="rgba(255,255,255,0.85)">
            {home.topic.label}
          </Body>
          <Squircle radius={20} fill="#75AF3E" glow="glass" style={styles.arrowBubble}>
            <View style={{ transform: [{ rotate: '-135deg' }] }}>
              <Icon name="arrowRight" size={22} color={colors.white} />
            </View>
          </Squircle>
        </View>
        <Display size={24} color={colors.white}>
          {home.topic.title}
        </Display>
        <Caption color="rgba(255,255,255,0.75)">{home.topic.meta}</Caption>
      </HeroCard>
      </Pressable>
    </Screen>
  );
}

/** Canvas «وردي اليوم» bar: grey 30% track with a soft inner shadow, indigo glass fill from the start side. */
function WirdProgress({ value }: { value: number }) {
  return (
    <View style={styles.thick} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}>
      <View style={styles.thickTrack} />
      <Squircle radius={15} fill="#4246B7" glow="frost" noise={51.2} style={[styles.thickFill, atStart(0), { width: `${value * 100}%` }]} />
    </View>
  );
}

function MiniCard({ title, icon }: { title: string; icon: IconName }) {
  return (
    <GlassCard soft tint="neutral" style={styles.mini}>
      <IconBubble name={icon} size={31} iconSize={16} color={colors.ink} />
      <Display size={15} lineHeight={20} style={{ marginTop: 'auto' }}>
        {title}
      </Display>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  avatar: { width: 53, height: 53, alignItems: 'center', justifyContent: 'center', marginEnd: 12 },
  dot: { position: 'absolute', top: 16, end: 12, width: 11, height: 11, borderRadius: 6, backgroundColor: '#D9BC85' },
  prayerChip: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center' },
  // both cards 171 × 189 in the canvas: equal slots, the card fills its slot
  halfSlot: { flex: 1, flexBasis: 0 },
  half: { height: 189, padding: 16 },
  thick: { height: 30, marginTop: 'auto' },
  thickTrack: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderRadius: 15, backgroundColor: '#818290', opacity: 0.3, boxShadow: 'inset 4px 4px 4px rgba(0,0,0,0.25)' },
  thickFill: { position: 'absolute', top: 0, bottom: 0 },
  smallChip: { height: 25, paddingHorizontal: 8, justifyContent: 'center' },
  rail: { marginHorizontal: -space.gutter, flexGrow: 0 },
  railContent: { paddingHorizontal: space.gutter, gap: 9 },
  mini: { width: 112, height: 116, padding: 14 },
  ring: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  arrowBubble: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
