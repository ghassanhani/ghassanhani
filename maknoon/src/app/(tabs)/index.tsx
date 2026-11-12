import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Squircle } from '@/components/Squircle';
import { AyahText, Body, Caption, Display } from '@/components/Typography';
import { GlassCard, HeroCard, IconBubble, RoundButton, Segments } from '@/components/ui';
import { home } from '@/content/design';
import { ayahPlaceholder, getAyah } from '@/content/quran';
import { colors, space } from '@/theme/tokens';

export default function HomeScreen() {
  const a = home.ayahOfDay;
  const ayah = getAyah(a.surah, a.ayah);

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
      <HeroCard hero="night" style={{ minHeight: 249, paddingTop: 30 }}>
        <View style={styles.between}>
          <View>
            <Body size={14} weight="medium" color={colors.gold}>
              {home.prayer.label}
            </Body>
            <Display size={44} color={colors.white} lineHeight={64}>
              {home.prayer.next}
            </Display>
            <Body size={12} color={colors.white} lineHeight={16}>
              {home.prayer.countdown}
            </Body>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 14 }}>
            <IconBubble name="compass" iconSize={20} color={colors.white} fill="rgba(255,255,255,0.12)" glow={false} />
            <Display size={44} color={colors.white} lineHeight={60}>
              {home.prayer.time}
            </Display>
          </View>
        </View>
        <View style={[styles.row, { gap: 7.6, marginTop: 'auto' }]}>
          {home.prayer.times.map((p) => (
            <Squircle
              key={p.name}
              radius={12}
              fill={p.active ? 'rgba(12,17,64,0.55)' : 'rgba(255,255,255,0.08)'}
              stroke="rgba(255,255,255,0.18)"
              style={styles.prayerChip}
            >
              <Body size={11} weight="medium" color={colors.white} lineHeight={15}>
                {p.name}
              </Body>
              <Body size={12} weight="bold" color={colors.white} lineHeight={16}>
                {p.time}
              </Body>
            </Squircle>
          ))}
        </View>
      </HeroCard>

      {/* Ayah of the day */}
      <Pressable accessibilityRole="button" onPress={() => router.push('/ayah/3:3')}>
        <GlassCard soft tint="neutral" style={{ minHeight: 189 }}>
          <View style={styles.between}>
            <Display size={20}>{a.title}</Display>
            <IconBubble name="play" iconSize={16} color={colors.white} fill={colors.primary} glow={false} />
          </View>
          <AyahText size={21} lineHeight={38} style={[{ marginTop: 6 }, ayah && { fontFamily: ayah.fontFamily }]}>
            {ayah ? ayah.text : ayahPlaceholder(a.surahName, a.ayah)}
          </AyahText>
          <Caption style={{ marginTop: 4 }}>{a.ref}</Caption>
        </GlassCard>
      </Pressable>

      {/* Wird + adhkar */}
      <View style={[styles.row, { gap: 12, alignItems: 'stretch' }]}>
        <GlassCard soft tint="lavender" style={styles.half}>
          <View style={styles.between}>
            <Body size={14} weight="medium">
              {home.wird.label}
            </Body>
            <IconBubble name="quran2" iconSize={20} color="#5B5FB0" />
          </View>
          <Display size={22} style={{ marginTop: 10 }}>
            {home.wird.title}
          </Display>
          <Caption>{home.wird.meta}</Caption>
          <View style={styles.thickTrack}>
            <View style={[styles.thickFill, { width: `${home.wird.progress * 100}%` }]} />
          </View>
        </GlassCard>
        <GlassCard soft tint="mint" style={styles.half}>
          <View style={styles.between}>
            <Body size={14} weight="medium">
              {home.adhkarCard.label}
            </Body>
            <IconBubble name="moonCloud" iconSize={20} color="#3E8A3A" />
          </View>
          <Display size={22} style={{ marginTop: 10 }}>
            {home.adhkarCard.title}
          </Display>
          <Caption>{home.adhkarCard.meta}</Caption>
          <Pressable accessibilityRole="button" style={[styles.row, { gap: 4, marginTop: 'auto' }]}>
            <Display size={14} color={colors.primary}>
              {home.adhkarCard.cta}
            </Display>
            <Icon name="arrowLeft" size={20} color={colors.primary} />
          </Pressable>
        </GlassCard>
      </View>

      {/* Hifz review */}
      <GlassCard soft tint="peach" style={{ minHeight: 139 }}>
        <View style={styles.between}>
          <Body size={15} weight="medium">
            {home.hifzReview.label}
          </Body>
          <IconBubble name="mic" iconSize={22} color={colors.white} fill="#E08A5B" glow={false} />
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

      {/* Adhkar rail */}
      <Display size={20}>الأذكار</Display>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rail} contentContainerStyle={styles.railContent}>
        {home.adhkarRail.map((d, i) => (
          <MiniCard key={i} title={d.title} icon={d.icon} />
        ))}
      </ScrollView>

      {/* Learn */}
      <Display size={20}>تعلّم</Display>
      <GlassCard soft tint="neutral" style={{ minHeight: 174 }}>
        <View style={styles.between}>
          <Body size={12} weight="medium">
            {home.learn.label}
          </Body>
          <IconBubble name="books" iconSize={22} color={colors.white} fill={colors.sky} glow={false} />
        </View>
        <Display size={20}>{home.learn.title}</Display>
        <View style={{ marginVertical: 14 }}>
          <Segments segments={home.learn.segments} />
        </View>
        <Caption>{home.learn.next}</Caption>
      </GlassCard>

      {/* Topic of the week */}
      <HeroCard hero="forest" style={{ minHeight: 139 }}>
        <View style={styles.between}>
          <Body size={12} weight="medium" color="rgba(255,255,255,0.85)">
            {home.topic.label}
          </Body>
          <Squircle radius={20} fill="#9ACD6A" glow="button" style={styles.arrowBubble}>
            <View style={{ transform: [{ rotate: '-45deg' }] }}>
              <Icon name="arrowRight" size={22} color={colors.white} />
            </View>
          </Squircle>
        </View>
        <Display size={24} color={colors.white}>
          {home.topic.title}
        </Display>
        <Caption color="rgba(255,255,255,0.75)">{home.topic.meta}</Caption>
      </HeroCard>
    </Screen>
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
  half: { flex: 1, minHeight: 189, padding: 16 },
  thickTrack: { height: 30, borderRadius: 15, backgroundColor: 'rgba(129,130,144,0.3)', marginTop: 'auto', overflow: 'hidden', flexDirection: 'row', boxShadow: 'inset 4px 4px 4px -1px rgba(0,0,0,0.15)' },
  thickFill: { borderRadius: 15, backgroundColor: '#8C8FE0', boxShadow: 'inset 0 -4px 4px rgba(255,255,255,0.35)' },
  smallChip: { height: 25, paddingHorizontal: 8, justifyContent: 'center' },
  rail: { marginHorizontal: -space.gutter, flexGrow: 0 },
  railContent: { paddingHorizontal: space.gutter, gap: 9 },
  mini: { width: 112, height: 116, padding: 14 },
  arrowBubble: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
