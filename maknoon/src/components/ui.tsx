import type { ReactNode } from 'react';
import { Pressable, type PressableProps, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, heroes, type HeroName, radius, space, tints, type TintName } from '@/theme/tokens';
import { Icon, type IconName } from './Icon';
import { Squircle } from './Squircle';
import { Body, Display } from './Typography';

type Box = { style?: StyleProp<ViewStyle>; children?: ReactNode };

/** White 70% glass card, radius 36, inner glows. Optional colour tint. */
export function GlassCard({ style, children, tint, soft }: Box & { tint?: TintName; soft?: boolean }) {
  return (
    <Squircle
      radius={radius.card}
      fill={soft ? colors.glassSoft : colors.glass}
      blobs={tint ? tints[tint] : undefined}
      glow="glass"
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
    <Squircle radius={radius.card} fill={h.fill} blobs={h.blobs} glow="button" style={[{ padding: space.cardPad }, style]}>
      {children}
    </Squircle>
  );
}

/** Solid white inner card (radius 20) used for list rows inside glass cards. */
export function InnerCard({ style, children }: Box) {
  return (
    <Squircle radius={radius.inner} fill={colors.white} style={[{ paddingVertical: 14, paddingHorizontal: 16 }, style]}>
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
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6}>
      <Squircle radius={size / 2} fill={colors.glass} glow="glass" style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={iconSize} color={colors.ink} />
      </Squircle>
    </Pressable>
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
    <Pressable accessibilityRole="button" onPress={onPress} style={style}>
      <Squircle radius={36} fill={colors.primary} glow="button" style={{ height, paddingHorizontal: compact ? 18 : 24, alignItems: 'center', justifyContent: 'center' }}>
        <Display size={14} color={colors.white} lineHeight={20}>
          {label}
        </Display>
      </Squircle>
    </Pressable>
  );
}

/** White pill button with icon (hero cards). */
export function PillButton({ label, icon, onPress, variant = 'solid' }: PressableProps & { label: string; icon?: IconName; variant?: 'solid' | 'glass' }) {
  const solid = variant === 'solid';
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ flex: 1 }}>
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
    </Pressable>
  );
}

/** Segmented progress (12pt, rounded 30) — 'on' sky, 'part' gold, 'off' track. */
export function Segments({ segments }: { segments: readonly ('on' | 'off' | 'part')[] }) {
  return (
    <View style={styles.segRow}>
      {segments.map((s, i) => (
        <View key={i} style={[styles.seg, s === 'on' ? styles.segOn : styles.segOff]}>
          {s === 'part' ? <View style={styles.segPart} /> : null}
        </View>
      ))}
    </View>
  );
}

/** Single progress bar (track + fill). */
export function ProgressBar({ value, height = 12, fill = colors.sky, track = colors.track }: { value: number; height?: number; fill?: string; track?: string }) {
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: track, overflow: 'hidden', flexDirection: 'row' }}>
      <View style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, backgroundColor: fill, borderRadius: height / 2 }} />
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
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 22, paddingHorizontal: 7, alignSelf: 'flex-start' },
  count: { minWidth: 25, height: 24, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  pill: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  segRow: { flexDirection: 'row', gap: 4 },
  seg: { flex: 1, height: 12, borderRadius: 30, overflow: 'hidden' },
  segOn: { backgroundColor: colors.sky, boxShadow: 'inset 0 -4px 4px rgba(255,255,255,0.35)' },
  segOff: { backgroundColor: colors.track, boxShadow: 'inset 4px 4px 4px -1px rgba(0,0,0,0.25)' },
  segPart: { position: 'absolute', end: 0, top: 0, bottom: 0, width: '66%', backgroundColor: '#B8975A', borderRadius: 30 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
});
