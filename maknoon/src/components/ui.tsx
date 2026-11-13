import { type ReactNode, useEffect, useState } from 'react';
import { type PressableProps, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Pressable } from '@/components/Tap';
import Animated, { interpolateColor, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { atStart, haptic, isRTL, motion, PressScale } from './motion';
import { F } from '@/theme/fonts';
import { colors, heroes, type HeroName, radius, space, tints, type TintName } from '@/theme/tokens';
import { Icon, type IconName } from './Icon';
import { Squircle } from './Squircle';
import { Body, Display } from './Typography';

type Box = { style?: StyleProp<ViewStyle>; children?: ReactNode };

/** White 70% glass card, radius 36, inner glows. Optional colour tint. */
/** `tint`: the coloured lights are a Home-only treatment in the canvas; cards elsewhere stay plain white glass. */
export function GlassCard({ style, children, tint, soft, radius: r = radius.card }: Box & { tint?: TintName; soft?: boolean; radius?: number }) {
  return (
    <Squircle
      radius={r}
      fill={soft ? colors.glassSoft : colors.glass}
      blobs={tint ? tints[tint] : undefined}
      glow="frost"
      style={[{ padding: space.cardPad }, style]}
    >
      {children}
    </Squircle>
  );
}

/** Dark hero card (prayer, resume reading, ayah of the day, topic). */
export function HeroCard({ hero, style, children }: Box & { hero: HeroName }) {
  const h = heroes[hero];
  return (
    <Squircle radius={radius.card} fill={h.fill} blobs={h.blobs} glow="frost" noise={128} style={[{ padding: space.cardPad }, style]}>
      {children}
    </Squircle>
  );
}

/** Solid white inner card (radius 20) used for list rows inside glass cards. */
/** `fill` colours the squircle itself; a backgroundColor in `style` would paint a square box behind it. */
export function InnerCard({ style, children, selected, fill = colors.white }: Box & { selected?: boolean; fill?: string }) {
  return (
    <Squircle radius={radius.inner} fill={fill} stroke={selected ? colors.primary : undefined} strokeWidth={2} style={[{ paddingVertical: 14, paddingHorizontal: 16 }, style]}>
      {children}
    </Squircle>
  );
}

/** 40pt circular glass bubble holding an icon (top-start corner of cards). */
export function IconBubble({ name, size = 40, iconSize = 20, color = colors.primary, fill = 'rgba(255,255,255,0.8)', glow = true }: { name: IconName; size?: number; iconSize?: number; color?: string; fill?: string; glow?: boolean }) {
  return (
    <Squircle radius={size / 2} fill={fill} glow={glow ? 'glass' : 'none'} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={name} size={iconSize} color={color} />
    </Squircle>
  );
}

/** 53pt round glass button (header actions / back). */
export function RoundButton({ icon, label, onPress, size = 53, iconSize = 24 }: { icon: IconName; label: string; onPress?: () => void; size?: number; iconSize?: number }) {
  return (
    <PressScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6} scaleTo={0.92}>
      <Squircle radius={size / 2} fill={colors.glass} glow="glass" style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={iconSize} color={colors.ink} />
      </Squircle>
    </PressScale>
  );
}

type ChipTone = 'reviewed' | 'suggested' | 'pending';
const chipTone: Record<ChipTone, { from: string; to: string; ink: string }> = {
  reviewed: { from: colors.reviewedFrom, to: colors.reviewedTo, ink: colors.reviewedInk },
  suggested: { from: colors.suggestedFrom, to: colors.suggestedTo, ink: colors.suggestedInk },
  pending: { from: colors.pendingFrom, to: colors.pendingTo, ink: colors.pendingInk },
};

/**
 * Status / grading chip. «مُراجَع» = green gradient with the badge icon on the
 * right (leading edge in RTL); «مقترح» = blue gradient.
 */
export function Chip({ label, tone, badge }: { label: string; tone: ChipTone; badge?: boolean }) {
  const t = chipTone[tone];
  return (
    <Squircle radius={11} gradient={[t.from, t.to]} style={styles.chip}>
      {badge ? <Icon name="badge" size={14} color={t.ink} strokeWidth={2} /> : null}
      <Body size={12} weight="medium" color={t.ink} lineHeight={18}>
        {label}
      </Body>
    </Squircle>
  );
}

export const ReviewedChip = () => <Chip label="مُراجَع" tone="reviewed" badge />;
export const SuggestedChip = () => <Chip label="مقترح" tone="suggested" />;

/** Teal count badge (e.g. "5" next to section titles). */
export function CountBadge({ value }: { value: string }) {
  return (
    <Squircle radius={12} gradient={['#015A5E', '#0C8B91']} style={styles.count}>
      <Display size={14.5} color={colors.white} lineHeight={20}>
        {value}
      </Display>
    </Squircle>
  );
}

/** Primary teal CTA (radius 36, inner light). */
export function Cta({ label, onPress, height = 50, style, compact }: { label: string; onPress?: () => void; height?: number; style?: StyleProp<ViewStyle>; compact?: boolean }) {
  return (
    <PressScale accessibilityRole="button" onPress={onPress} style={style} feedback="tap">
      {/* canvas: the full glass light on teal (inner .65 / wide .2 / top .95 / bottom .65) with 51.2pt grain */}
      <Squircle radius={36} fill={colors.primary} glow="frost" noise={51.2} style={{ height, paddingHorizontal: compact ? 18 : 24, alignItems: 'center', justifyContent: 'center' }}>
        <Display size={14} color={colors.white} lineHeight={20} style={{ fontFamily: F.cta }}>
          {label}
        </Display>
      </Squircle>
    </PressScale>
  );
}

/** White pill button with icon (hero cards). */
export function PillButton({ label, icon, onPress, variant = 'solid' }: PressableProps & { label: string; icon?: IconName; variant?: 'solid' | 'glass' }) {
  const solid = variant === 'solid';
  return (
    <PressScale accessibilityRole="button" onPress={onPress} style={{ flex: 1 }}>
      <Squircle
        radius={24}
        fill={solid ? colors.white : 'rgba(255,255,255,0.25)'}
        glow={solid ? 'none' : 'button'}
        stroke={solid ? undefined : 'rgba(255,255,255,0.6)'}
        style={styles.pill}
      >
        {icon ? <Icon name={icon} size={22} color={colors.ink} /> : null}
        <Display size={14} color={solid ? colors.ink : colors.white} lineHeight={20}>
          {label}
        </Display>
      </Squircle>
    </PressScale>
  );
}

/** Segmented progress (12pt, rounded 30) — 'on' sky, 'part' gold, 'off' track. */
/** `light`: where the done segments catch the light — 'top' (تعلّم card) or 'bottom' (Quran hub), as drawn. */
export function Segments({ segments, light = 'top' }: { segments: readonly ('on' | 'off' | 'part')[]; light?: 'top' | 'bottom' }) {
  return (
    <View style={styles.segRow}>
      {segments.map((s, i) => (
        // canvas: 52pt segments, the one in progress 30pt with a 20pt gold fill at its start
        <View key={i} style={[styles.seg, { flex: s === 'part' ? 30 : 52 }]}>
          {s === 'on' ? <View style={[styles.segFill, styles.segOn, light === 'bottom' && styles.segOnSoft]} /> : <View style={[styles.segFill, styles.segOff]} />}
          {s === 'part' ? <View style={[styles.segPart, atStart(0)]} /> : null}
        </View>
      ))}
    </View>
  );
}

/**
 * Single progress bar, as drawn in the canvas: a solid `track` colour at `trackOpacity` with a soft inner shadow,
 * and a fill from the start side with the inner light (0 4 blur 2 white .95, 0 -4 blur 2 white .15).
 */
export function ProgressBar({ value, height = 12, fill = colors.sky, track = '#818290', trackOpacity = 0.3 }: { value: number; height?: number; fill?: string; track?: string; trackOpacity?: number }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <View style={{ height }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(v * 100) }}>
      <View style={[styles.segFill, { borderRadius: height / 2, borderCurve: 'continuous', backgroundColor: track, opacity: trackOpacity, boxShadow: 'inset 4px 4px 4px rgba(0,0,0,0.25)' }]} />
      {v > 0 ? (
        <View style={[styles.barFill, atStart(0), { width: `${v * 100}%`, borderRadius: height / 2, borderCurve: 'continuous', backgroundColor: fill }]} />
      ) : null}
    </View>
  );
}

export function SectionTitle({ title, trailing }: { title: string; trailing?: ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <Display size={20}>{title}</Display>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 22, paddingVertical: 2, paddingHorizontal: 7, alignSelf: 'flex-start', maxWidth: '100%' },
  count: { minWidth: 25, height: 24, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  pill: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  segRow: { flexDirection: 'row', gap: 4 },
  seg: { height: 12, borderRadius: 30, borderCurve: 'continuous', overflow: 'hidden' },
  segFill: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderRadius: 30 , borderCurve: 'continuous'},
  // done: #3AAADA with the canvas inner light (0 4 blur 2 white .95, 0 -4 blur 2 white .15)
  segOn: { backgroundColor: '#3AAADA', boxShadow: 'inset 0 4px 4px rgba(255,255,255,0.95), inset 0 -4px 4px rgba(255,255,255,0.15)' },
  segOnSoft: { boxShadow: 'inset 0 -4px 4px rgba(255,255,255,0.35)' },
  barFill: { position: 'absolute', top: 0, bottom: 0, boxShadow: 'inset 0 4px 4px rgba(255,255,255,0.95), inset 0 -4px 4px rgba(255,255,255,0.15)' },
  // to go: #818290 at 30% with a soft inner shadow
  segOff: { backgroundColor: '#818290', opacity: 0.3, boxShadow: 'inset 4px 4px 4px rgba(0,0,0,0.25)' },
  segPart: { position: 'absolute', top: 0, bottom: 0, width: '66.7%', backgroundColor: '#A57D33', borderRadius: 30, borderCurve: 'continuous', boxShadow: 'inset 0 2px 3px rgba(255,255,255,0.95), inset 0 -4px 4px rgba(255,255,255,0.15)' },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  segTrack: { flexDirection: 'row', gap: 6, padding: 4, borderRadius: 30, borderCurve: 'continuous', backgroundColor: 'rgba(129,130,144,0.12)' },
  segBtn: { minHeight: 42, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  segPill: { position: 'absolute', top: 4, bottom: 4, backgroundColor: colors.white, boxShadow: '0 2px 6px rgba(39,40,51,0.08)', borderRadius: 22, borderCurve: 'continuous' },
  switch: { width: 50, height: 30, borderRadius: 15, borderCurve: 'continuous', padding: 3, justifyContent: 'center' },
  switchOnShadow: { boxShadow: 'inset 0 3px 4px rgba(255,255,255,0.35)' },
  switchOffShadow: { boxShadow: 'inset 3px 3px 4px -1px rgba(0,0,0,0.25)' },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.white, boxShadow: '0 1px 3px rgba(0,0,0,0.2)' },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  stepBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.ring, alignItems: 'center', justifyContent: 'center' },
  soft: { minHeight: 46, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
});

/** Two-or-more option segmented control: a white pill glides to the chosen option. */
export function Segmented<T extends string | number>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const [w, setW] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const n = options.length;
  const inner = Math.max(0, w - 8 - 6 * (n - 1)); // track padding 4+4, gaps of 6
  const itemW = n ? inner / n : 0;
  const x = useSharedValue(0);
  const reduced = useReducedMotion();
  const rtl = isRTL();
  useEffect(() => {
    // The pill sits at the start edge; it moves toward the end by one option per step.
    const step = index * (itemW + 6);
    const to = rtl ? -step : step;
    x.set(reduced || !w ? to : withSpring(to, motion.settleSpring));
  }, [index, itemW, rtl, reduced, w, x]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View accessibilityRole="radiogroup" style={styles.segTrack} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w ? (
        <Animated.View pointerEvents="none" style={[styles.segPill, atStart(4), { width: itemW }, pill]} />
      ) : null}
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => {
              if (!on) haptic.select();
              onChange(o.value);
            }}
            style={[{ flex: 1 }, styles.segBtn]}
          >
            <Body size={13} weight={on ? 'bold' : 'medium'} color={on ? colors.primary : '#4A4B57'} lineHeight={18}>
              {o.label}
            </Body>
          </Pressable>
        );
      })}
    </View>
  );
}

/** iOS-style switch in the canvas colours. The knob glides and the track colour cross-fades. */
export function Switch({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  const reduced = useReducedMotion();
  const on = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    on.set(reduced ? (value ? 1 : 0) : withSpring(value ? 1 : 0, motion.settleSpring));
  }, [value, reduced, on]);
  const dir = isRTL() ? -1 : 1; // "on" sits at the start side: right in RTL
  const track = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(on.value, [0, 1], ['rgba(129,130,144,0.3)', colors.primary]) }));
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: dir * 20 * (1 - on.value) }, { scale: 1 + 0.06 * Math.sin(Math.PI * on.value) }] }));
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => {
        haptic.select();
        onChange(!value);
      }}
      hitSlop={8}
    >
      <Animated.View style={[styles.switch, value ? styles.switchOnShadow : styles.switchOffShadow, track]}>
        <Animated.View style={[styles.knob, { alignSelf: 'flex-start' }, knob]} />
      </Animated.View>
    </Pressable>
  );
}

/** − n + stepper. */
export function Stepper({ value, onInc, onDec, label }: { value: string; onInc: () => void; onDec: () => void; label: string }) {
  return (
    <View style={styles.stepper}>
      <PressScale accessibilityRole="button" accessibilityLabel={`إنقاص ${label}`} onPress={onDec} innerStyle={styles.stepBtn} scaleTo={0.88} feedback="select">
        <Icon name="minus" size={18} color={colors.ink} />
      </PressScale>
      <Display size={18} lineHeight={24}>
        {value}
      </Display>
      <PressScale accessibilityRole="button" accessibilityLabel={`زيادة ${label}`} onPress={onInc} innerStyle={styles.stepBtn} scaleTo={0.88} feedback="select">
        <Icon name="plus" size={18} color={colors.ink} />
      </PressScale>
    </View>
  );
}

/** Soft outline button (rgba(247,241,241,.61) + white stroke). */
export function SoftButton({ label, onPress, style }: { label: string; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <PressScale accessibilityRole="button" onPress={onPress} style={style}>
      <Squircle radius={30} fill="rgba(247,241,241,0.61)" stroke="#FFFFFF" glow="glass" style={styles.soft}>
        <Body size={14} weight="medium" color={colors.primary} lineHeight={20}>
          {label}
        </Body>
      </Squircle>
    </PressScale>
  );
}


/** Shown on a calculator until its scholar-validated test cases pass (SPEC §2.10). */
export function ReviewNotice() {
  return (
    <Squircle radius={24} gradient={['#E8CF9A', '#F3E2B9']} style={{ padding: 16, gap: 4 }}>
      <Body size={14} weight="bold" color={colors.pendingInk}>
        قيد المراجعة العلمية
      </Body>
      <Body size={13} color={colors.pendingInk}>
        هذه الحاسبة تجريبية: لم تُعتمد حالات اختبارها من أهل العلم بعد. لا تعتمد على نتيجتها، وارجع إلى عالم موثوق.
      </Body>
    </Squircle>
  );
}
