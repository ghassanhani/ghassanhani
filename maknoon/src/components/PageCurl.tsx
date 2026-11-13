import { LinearGradient } from 'expo-linear-gradient';
import { memo, type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';

/**
 * A paper page curl, as in a printed book or a flipbook: the leaf stays flat from the binding
 * (right edge) to a fold line; past the fold the paper rolls round a cylinder, drawn as one roll
 * of paper (its back, shaded as a cylinder: dark at the silhouette, lit across the crown), and the
 * roll casts a soft shadow on the page beneath. The roll is fullest mid-turn, as paper is. One
 * sheet only: no squeezed copy of the page and no separate strip beside the roll, which together
 * read as a second page turning.
 *
 * `progress` 0 → 1 moves the fold from the free (left) edge past the binding: 0 = flat, 1 = turned.
 * `visible` (0/1) shows the curl only while a turn is under way; at rest it is out of the layout.
 * `leaf` draws the turning page; `under` the page that appears beneath it. Geometry is physical
 * (laid out left-to-right); the pages inside keep their right-to-left layout.
 * `fromRight`: the leaf lifts from its right edge and turns to the left (binding on the left) — the
 * whole curl is mirrored, and each page copy is mirrored back so its text reads normally.
 */
const PAPER = '#EDE7DD';

export const PageCurl = memo(function PageCurl({
  progress,
  visible,
  width: W,
  height: H,
  leaf,
  under,
  fromRight = false,
  paper = PAPER,
}: {
  fromRight?: boolean;
  /** colour of the paper's back (dark in the mushaf's dark mode) */
  paper?: string;
  progress: SharedValue<number>;
  visible: SharedValue<number>;
  width: number;
  height: number;
  leaf: ReactNode;
  under: ReactNode;
}) {
  // The fold position and the roll's radius for a given progress (the roll is fullest mid-turn).
  const geo = (p: number) => {
    'worklet';
    const t = Math.max(0, Math.min(1, p));
    const R = W * (0.06 + 0.12 * Math.sin(Math.PI * Math.min(1, t * 1.15)));
    return { x: t * W * 1.42, R };
  };

  // at rest the curl is out of the layout altogether
  const root = useAnimatedStyle(() => ({ opacity: visible.get(), display: visible.get() > 0 ? 'flex' : 'none' }));
  // the page beneath, left of the roll
  const underStyle = useAnimatedStyle(() => {
    const { x, R } = geo(progress.get());
    return { width: Math.max(0, x - R) };
  });
  // the roll's soft shadow on that page: strongest mid-turn
  const castShadow = useAnimatedStyle(() => {
    const p = progress.get();
    const { x, R } = geo(p);
    return { left: x - R - W * 0.38, opacity: Math.sin(Math.PI * Math.max(0, Math.min(1, p))) };
  });
  // the leaf, flat from the fold to the binding
  const flat = useAnimatedStyle(() => {
    const { x } = geo(progress.get());
    return { left: x, width: Math.max(0, W - x) };
  });
  const flatInner = useAnimatedStyle(() => ({ transform: [{ translateX: -geo(progress.get()).x }] }));
  // the roll: one cylinder of paper, its back showing as it wraps over (no squeezed copy of the
  // page, no separate strip beside it, so it reads as one sheet curling, never as two)
  const roll = useAnimatedStyle(() => {
    const { x, R } = geo(progress.get());
    return { left: x - R, width: R + 1 };
  });
  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, fromRight && styles.mirror, root]} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, styles.ltr]}>
      {/* 1 · the page beneath, and the roll's shadow on it */}
      <Animated.View style={[styles.clip, { left: 0, height: H }, underStyle]}>
        <View style={[styles.pinned, { width: W, height: H }, styles.rtl, fromRight && styles.mirror]}>{under}</View>
      </Animated.View>
      <Animated.View style={[styles.abs, { width: W * 0.38, height: H }, castShadow]}>
        <LinearGradient colors={['rgba(30,20,10,0)', 'rgba(30,20,10,0.08)', 'rgba(30,20,10,0.30)']} locations={[0, 0.55, 1]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
      {/* 2 · the leaf, flat */}
      <Animated.View style={[styles.clip, { height: H }, flat]}>
        <Animated.View style={[styles.pinned, { width: W, height: H }, flatInner]}>
          <View style={[StyleSheet.absoluteFill, styles.rtl, fromRight && styles.mirror]}>{leaf}</View>
        </Animated.View>
      </Animated.View>
      {/* 3 · the roll: the back of the paper wrapped round a cylinder: dark at its silhouette, lit
          across its crown, easing into the flat page at the fold */}
      <Animated.View style={[styles.abs, { height: H, backgroundColor: paper }, roll]}>
        <LinearGradient
          colors={['rgba(30,22,14,0.42)', 'rgba(30,22,14,0.10)', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0.18)', 'rgba(30,22,14,0.10)']}
          locations={[0, 0.18, 0.45, 0.72, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  root: { overflow: 'hidden' },
  // the curl's geometry is physical; the pages inside keep right-to-left (on the web the document
  // direction already does this, and react-native-web has no `direction` style)
  ltr: Platform.OS === 'web' ? {} : { direction: 'ltr' },
  rtl: Platform.OS === 'web' ? {} : { direction: 'rtl' },
  abs: { position: 'absolute', top: 0 },
  clip: { position: 'absolute', top: 0, overflow: 'hidden' },
  // a page copy is pinned to the window's left edge (in a right-to-left page it would otherwise hang from the right)
  pinned: { position: 'absolute', left: 0, top: 0 },
  mirror: { transform: [{ scaleX: -1 }] },
});
