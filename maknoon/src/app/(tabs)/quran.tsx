import { router } from 'expo-router';
import { Fragment } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Pressable } from '@/components/Tap';
import Svg, { ClipPath, Defs, G, Path } from 'react-native-svg';
import { Icon, type IconName } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Squircle } from '@/components/Squircle';
import { Body, Caption, Display } from '@/components/Typography';
import { Cta, GlassCard, HeroCard, IconBubble, InnerCard, PillButton, ProgressBar, Segments } from '@/components/ui';
import { quranHub as q } from '@/content/design';
import { ar } from '@/content/quran';
import { recitationById, togglePage, usePlayer } from '@/recitation/player';
import { usePrefs } from '@/store/prefs';
import { readingAt, readingMeta } from '@/store/reading';
import { colors, space } from '@/theme/tokens';

export default function QuranHubScreen() {
  // Everything on this tab follows the reading position kept on the device.
  const [prefs] = usePrefs();
  const r = readingAt(prefs.lastPage);
  const audio = usePlayer();
  const listening = audio.playing === 'page';
  const openMushaf = () => router.push({ pathname: '/mushaf', params: { page: String(r.page) } });
  return (
    <Screen backdrop="mint">
      <Display size={30} lineHeight={44} style={{ marginTop: 8 }}>
        {q.title}
      </Display>

      {/* Continue reading */}
      <HeroCard hero="teal" style={{ paddingTop: 30, gap: 4 }}>
        <Body size={14} weight="medium" color={colors.gold}>
          {r.started ? q.resume.label : 'ابدأ القراءة'}
        </Body>
        <Display size={40} color={colors.white} lineHeight={60}>
          {`سورة ${r.surahName}`}
        </Display>
        <Body size={12} color={colors.white}>
          {`${readingMeta(r)} · صفحة ${ar(r.page)}`}
        </Body>
        <View style={{ marginVertical: 18 }}>
          <ProgressBar value={r.progress} fill="#26CCDB" track="#FFFFFF" />
        </View>
        <View style={styles.row}>
          <PillButton label="المصحف" icon="quranSolid" onPress={openMushaf} />
          <PillButton label="فهرس السور" variant="glass" onPress={() => router.push('/surahs')} />
        </View>
      </HeroCard>

      {/* Khatma */}
      <GlassCard>
        <View style={styles.between}>
          <View>
            <Display size={24}>{q.khatma.title}</Display>
            <Body size={13} color={colors.primary}>
              {q.khatma.plan}
            </Body>
          </View>
          <Ring value={r.progress} label={ar(r.juz - 1)} unit={q.khatma.unit} />
        </View>
        <InnerCard style={[styles.between, { marginTop: 14, alignItems: 'center' }]}>
          <View>
            <Caption color={colors.ink}>{q.khatma.wirdLabel}</Caption>
            <Body size={14} weight="bold">
              {`الجزء ${ar(r.juz)} · نحو ٢٠ صفحة`}
            </Body>
          </View>
          <Cta label={q.khatma.cta} height={42} compact style={{ minWidth: 101 }} onPress={openMushaf} />
        </InnerCard>
      </GlassCard>

      {/* Shortcuts rail */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rail} contentContainerStyle={styles.railContent}>
        {q.shortcuts.map((s) => (
          <Pressable key={s.title} accessibilityRole="button" onPress={() => s.route && router.push(s.route)}>
            <GlassCard radius={28} style={styles.mini}>
              <IconBubble name={s.icon} size={31} iconSize={16} color={colors.ink} />
              <Display size={16} lineHeight={21} style={{ marginTop: 'auto' }}>
                {s.title}
              </Display>
            </GlassCard>
          </Pressable>
        ))}
      </ScrollView>

      {/* Listen: the card opens the listening hub; its button plays from the reading position */}
      <Pressable accessibilityRole="link" accessibilityLabel="مركز الاستماع" onPress={() => router.push('/listen')}>
        <GlassCard>
          <View style={styles.between}>
            <View style={{ flex: 1 }}>
              <Display size={24}>{q.listen.title}</Display>
              <Body size={15} weight="medium">
                {`سورة ${r.surahName}`}
              </Body>
              <Body size={13} color={colors.primary}>
                {`${recitationById(prefs.reciter).name} · من الآية ${ar(r.ayah)}`}
              </Body>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={listening ? 'إيقاف التلاوة' : 'استماع'} onPress={() => togglePage(r.surah, r.ayah)}>
              <Squircle radius={25} fill={colors.primary} glow="button" style={[styles.center, { width: 50, height: 50, alignSelf: 'flex-end' }]}>
                <Icon name={listening ? 'pause' : 'play'} size={20} color={colors.white} />
              </Squircle>
            </Pressable>
          </View>
        </GlassCard>
      </Pressable>

      {/* Memorise */}
      <Pressable accessibilityRole="link" onPress={() => router.push('/hifz')}>
        <Display size={22}>{q.hifz.title}</Display>
      </Pressable>
      <GlassCard>
        <View style={[styles.between, { alignItems: 'center' }]}>
          <Display size={18}>{q.hifz.plan}</Display>
          <Body size={13} color={colors.muted}>
            {q.hifz.count}
          </Body>
        </View>
        <View style={{ marginTop: 12, marginBottom: 6 }}>
          <Segments segments={['on', 'on', 'off']} light="bottom" />
        </View>
        {q.hifz.items.map((it) => (
          <View key={it.title} style={[styles.row, { paddingVertical: 12, gap: 14 }]}>
            <View style={[styles.dotRing, it.state === 'warn' && { borderColor: '#F2C7C7' }]} />
            <View>
              <Display size={17}>{it.title}</Display>
              <Body size={12} color={colors.primary}>
                {it.meta}
              </Body>
            </View>
          </View>
        ))}
        <Cta label={q.hifz.cta} style={{ marginTop: 8 }} onPress={() => router.push('/hifz/session')} />
      </GlassCard>
      <View style={styles.row}>
        {q.hifz.tools.map((t) => (
          <Pressable
            key={t.title}
            accessibilityRole="button"
            style={{ flex: 1 }}
            // «التسميع»: the Mushaf where the reader stopped, the check running · «المتشابهات»: the notebook
            onPress={() => (t.icon === 'mic' ? router.push({ pathname: '/mushaf', params: { page: String(prefs.lastPage || 1), tasmee: '1' } }) : router.push('/notebook'))}
          >
          <GlassCard style={[styles.toolCard]}>
            <View style={[styles.row, { gap: 10 }]}>
              <IconBubble name={t.icon} size={31} iconSize={16} color={colors.ink} />
              <View>
                <Display size={15} lineHeight={20}>
                  {t.title}
                </Display>
                <Caption color={colors.primary}>{t.icon === 'books' && prefs.slips.length ? `${ar(new Set(prefs.slips.map((x) => x.key)).size)} مواضع` : t.meta}</Caption>
              </View>
            </View>
          </GlassCard>
          </Pressable>
        ))}
      </View>

      {/* Understand */}
      <Display size={22}>{q.understand.title}</Display>
      <GlassCard>
        {q.understand.items.map((it, i) => (
          <Fragment key={it.title}>
            {i ? <View style={styles.hairline} /> : null}
            <Pressable accessibilityRole="button" onPress={() => 'route' in it && router.push(it.route as never)} style={[styles.between, { alignItems: 'center', paddingVertical: 12 }]}>
              <View style={{ flex: 1 }}>
                <Display size={17}>{it.title}</Display>
                <Body size={12} color={colors.primary}>
                  {it.meta}
                </Body>
              </View>
              {'route' in it ? <Icon name="chevronLeft" size={20} color={colors.ink} /> : null}
            </Pressable>
          </Fragment>
        ))}
        <Cta label={q.understand.cta} style={{ marginTop: 12 }} />
      </GlassCard>

      {/* My Quran */}
      <Display size={22}>{q.mine.title}</Display>
      <View style={styles.row}>
        {q.mine.items.map((m) => {
          // real counts from the device
          const notes = Object.entries(prefs.notes).filter(([k, t]) => k.startsWith('ayah:') && t.trim()).length;
          const n = m.icon === 'bookmark' ? prefs.bookmarks.length : m.icon === 'brush' ? prefs.highlights.length : notes;
          const to = m.icon === 'bookmark' ? '/bookmarks' : m.icon === 'brush' ? '/bookmarks?kind=highlights' : '/notes';
          return (
            <Pressable key={m.title} style={{ flex: 1 }} accessibilityRole="button" onPress={() => router.push(to as never)}>
              <GlassCard style={styles.mineCard}>
                <IconBubble name={m.icon as IconName} size={31} iconSize={16} color={colors.ink} />
                <View style={{ marginTop: 'auto' }}>
                  <Display size={16}>{m.title}</Display>
                  <Body size={13} color={colors.primary}>
                    {ar(n)}
                  </Body>
                </View>
              </GlassCard>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

/** A ring segment (annulus with round ends) clockwise from 12 o'clock, as one closed path. */
function arcPath(c: number, R: number, r: number, frac: number) {
  const f = Math.min(Math.max(frac, 0.001), 0.9999);
  const hw = (R - r) / 2;
  const a0 = -Math.PI / 2;
  const a1 = a0 + f * 2 * Math.PI;
  const pt = (a: number, rad: number) => `${(c + rad * Math.cos(a)).toFixed(3)} ${(c + rad * Math.sin(a)).toFixed(3)}`;
  const large = f > 0.5 ? 1 : 0;
  return `M${pt(a0, R)}A${R} ${R} 0 ${large} 1 ${pt(a1, R)}A${hw} ${hw} 0 0 1 ${pt(a1, r)}A${r} ${r} 0 ${large} 0 ${pt(a0, r)}A${hw} ${hw} 0 0 1 ${pt(a0, R)}Z`;
}

/** The canvas inner shadow: everything outside `d`, offset and blurred, painted inside `d`. */
function RingInset({ id, d, size, dx, dy, color }: { id: string; d: string; size: number; dx: number; dy: number; color: string; blur: number }) {
  // the inner shadow without an SVG filter (filters are slow on phones): the offset edge, drawn twice softly
  return (
    <>
      <Defs>
        <ClipPath id={`c${id}`}>
          <Path d={d} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#c${id})`}>
        <Path d={`M-20 -20H${size + 20}V${size + 20}H-20Z ${d}`} fill={color} fillOpacity={0.55} fillRule="evenodd" transform={`translate(${dx} ${dy})`} />
        <Path d={`M-20 -20H${size + 20}V${size + 20}H-20Z ${d}`} fill={color} fillOpacity={0.45} fillRule="evenodd" transform={`translate(${dx * 0.5} ${dy * 0.5})`} />
      </G>
    </>
  );
}

function Ring({ value, label, unit }: { value: number; label: string; unit: string }) {
  // canvas: a 50pt ring 6.6pt thick. Track #C6B2B2 at 30% with a dark inner shadow (4 4 blur 2, 25%);
  // arc #3526DB with round ends and a white inner light (0 4 blur 2, 72%).
  const size = 52;
  const c = size / 2;
  const R = 25.05;
  const r = R - 6.57;
  const track = `M${c - R} ${c}a${R} ${R} 0 1 0 ${2 * R} 0a${R} ${R} 0 1 0 ${-2 * R} 0Z M${c - r} ${c}a${r} ${r} 0 1 1 ${2 * r} 0a${r} ${r} 0 1 1 ${-2 * r} 0Z`;
  const arc = arcPath(c, R, r, Math.max(value, 0.08));
  return (
    <View style={[styles.center, { width: size, height: size }]}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <G opacity={0.3}>
          <Path d={track} fill="#C6B2B2" fillRule="evenodd" />
          <RingInset id="t" d={track} size={size} dx={4} dy={4} color="rgba(0,0,0,0.25)" blur={2} />
        </G>
        <Path d={arc} fill="#3526DB" />
        <RingInset id="a" d={arc} size={size} dx={0} dy={4} color="rgba(255,255,255,0.72)" blur={2} />
      </Svg>
      <Display size={17} lineHeight={17}>
        {label}
      </Display>
      <Display size={10} lineHeight={13}>
        {unit}
      </Display>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  center: { alignItems: 'center', justifyContent: 'center' },
  rail: { marginHorizontal: -space.gutter, flexGrow: 0 },
  railContent: { paddingHorizontal: space.gutter, gap: 9 },
  mini: { width: 112, height: 116, padding: 14 },
  dotRing: { width: 18, height: 18, borderRadius: 9, borderWidth: 4, borderColor: colors.sky, backgroundColor: colors.white },
  toolCard: { flex: 1, paddingVertical: 14, paddingHorizontal: 14, borderRadius: 24 , borderCurve: 'continuous'},
  hairline: { height: 1, backgroundColor: colors.hairline },
  mineCard: { height: 116, padding: 14 },
});
