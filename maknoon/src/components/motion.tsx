import * as Haptics from 'expo-haptics';
import { type ReactNode, useEffect } from 'react';
import { I18nManager, Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

/**
 * Motion language of المكنون — calm, short, never decorative for its own sake.
 *
 *  · press      things you touch give way slightly (scale ≈ 0.96) and settle back on a spring
 *  · enter      content rises 8pt and fades in, cards one after another (45ms apart, max 8)
 *  · move       a selection glides to its new place instead of jumping
 *  · breathe    the one live element on a screen (next prayer, listening mic) breathes slowly
 *
 * Every animation follows the system "Reduce Motion" setting. Haptics are light and only on
 * deliberate actions (a choice, a toggle, starting/stopping the recitation check), never on scroll.
 * No celebrations, streaks or rewards (CLAUDE.md: calm, respectful UX).
 */
export const motion = {
  pressSpring: { damping: 18, stiffness: 420, mass: 0.6 },
  settleSpring: { damping: 20, stiffness: 240, mass: 0.8 },
  enter: 300,
  stagger: 35,
  maxStagger: 6,
  fade: 220,
  breathe: 1600,
} as const;

const nativeHaptics = Platform.OS === 'ios' || Platform.OS === 'android';
export const haptic = {
  /** a light tap: primary buttons */
  tap: () => nativeHaptics && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  /** a choice changed: tabs, segments, switches, pickers */
  select: () => nativeHaptics && Haptics.selectionAsync().catch(() => {}),
  /** a meaningful moment: recitation check starts/ends */
  soft: () => nativeHaptics && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {}),
  /** the recitation check found a word to re-check */
  warn: () => nativeHaptics && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}),
};

/** RTL as the screen is laid out (native forces RTL; the web build sets dir="rtl"). */
export const isRTL = (): boolean => I18nManager.isRTL || (Platform.OS === 'web' && typeof document !== 'undefined' && document.documentElement.dir === 'rtl');

/**
 * Pin something to the reading-start edge (the right in RTL) on every platform.
 * Native RTL flips `start`; react-native-web does not (it maps `start` to the left), so the web
 * build uses the physical side instead.
 */
export const atStart = (offset: number): { start?: number; right?: number; left?: number } =>
  Platform.OS === 'web' ? (isRTL() ? { right: offset } : { left: offset }) : { start: offset };

/** Layout changes (a pill growing, a row appearing) glide instead of jumping. */
/** The tab bar: a critically damped glide (no wobble), quick enough to follow the finger. */
export const tabGlide = LinearTransition.duration(260).easing(Easing.out(Easing.cubic)).reduceMotion(ReduceMotion.System);

export const glide = LinearTransition.springify().damping(22).stiffness(260).reduceMotion(ReduceMotion.System);

/**
 * Entering animation for the i-th item of a list or screen. The first few items rise one after
 * another; items further down (usually off-screen, or added later such as a new answer) appear
 * without delay. One shared object per position, so a re-render never hands a card a new
 * animation (the web build would replay it).
 */
const ENTER = new Map<number, ReturnType<typeof FadeInDown.duration>>();
export function enterAt(i: number) {
  const k = i <= motion.maxStagger ? i : -1;
  let e = ENTER.get(k);
  if (!e) {
    e = FadeInDown.duration(motion.enter)
      .delay(k < 0 ? 0 : k * motion.stagger)
      .withInitialValues({ transform: [{ translateY: 8 }] })
      .easing(Easing.out(Easing.cubic))
      .reduceMotion(ReduceMotion.System);
    ENTER.set(k, e);
  }
  return e;
}

export const fadeIn = FadeIn.duration(motion.fade).reduceMotion(ReduceMotion.System);
export const fadeOut = FadeOut.duration(160).reduceMotion(ReduceMotion.System);

type PressScaleProps = Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  /** style of the pressable (layout: flex, alignSelf…) */
  style?: StyleProp<ViewStyle>;
  /** style of the moving layer */
  innerStyle?: StyleProp<ViewStyle>;
  scaleTo?: number;
  feedback?: 'tap' | 'select' | 'soft' | 'none';
};

/** A Pressable whose content gives way under the finger and springs back. */
export function PressScale({ children, style, innerStyle, scaleTo = 0.96, feedback = 'none', onPressIn, onPressOut, onPress, disabled, ...rest }: PressScaleProps) {
  const reduced = useReducedMotion();
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Pressable
      {...rest}
      disabled={disabled}
      style={style}
      onPressIn={(e) => {
        if (!reduced) s.set(withSpring(scaleTo, motion.pressSpring));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        s.set(withSpring(1, motion.settleSpring));
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (feedback !== 'none') haptic[feedback]();
        onPress?.(e);
      }}
    >
      <Animated.View style={[innerStyle, anim, disabled && { opacity: 0.5 }]}>{children}</Animated.View>
    </Pressable>
  );
}

/** Slow breathing (scale + opacity) for the single live element on a screen. */
export function Breathe({ children, active = true, style, scale = 1.08 }: { children?: ReactNode; active?: boolean; style?: StyleProp<ViewStyle>; scale?: number }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (!active || reduced) {
      t.set(withTiming(0, { duration: motion.fade }));
      return;
    }
    t.set(withRepeat(withSequence(withTiming(1, { duration: motion.breathe, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: motion.breathe, easing: Easing.inOut(Easing.sin) })), -1));
  }, [active, reduced, t]);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: 1 + (scale - 1) * t.value }], opacity: 1 - 0.25 * t.value }));
  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}

/** A ring that swells outward and fades, repeating — used around the listening microphone. */
export function Ripple({ size, color, active }: { size: number; color: string; active: boolean }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (!active || reduced) {
      t.set(0);
      return;
    }
    t.set(withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1));
  }, [active, reduced, t]);
  const anim = useAnimatedStyle(() => ({ opacity: active ? 0.45 * (1 - t.value) : 0, transform: [{ scale: 1 + 0.45 * t.value }] }));
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderCurve: 'continuous', borderWidth: 2, borderColor: color }, anim]} />;
}

/** Three dots that rise in turn while an answer is being looked up. */
export function TypingDots({ color }: { color: string }) {
  return (
    <Animated.View entering={fadeIn} style={{ flexDirection: 'row', gap: 6, alignSelf: 'center', paddingVertical: 10 }} accessibilityLabel="جارٍ البحث">
      {[0, 1, 2].map((i) => (
        <Dot key={i} i={i} color={color} />
      ))}
    </Animated.View>
  );
}
function Dot({ i, color }: { i: number; color: string }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    t.set(withDelay(i * 140, withRepeat(withSequence(withTiming(1, { duration: 320 }), withTiming(0, { duration: 320 }), withTiming(0, { duration: 260 })), -1)));
  }, [i, reduced, t]);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateY: -4 * t.value }], opacity: 0.45 + 0.55 * t.value }));
  return <Animated.View style={[{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: color }, anim]} />;
}
