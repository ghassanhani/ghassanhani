import { LinearGradient } from 'expo-linear-gradient';
import { memo, type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';

/**
 * A paper page curl, as in a printed book or a flipbook: the leaf stays flat from the binding
 * (right edge) to a fold line; past the fold the paper rolls round a cylinder (drawn as fine strips,
 * each squeezed by the cylinder's curve), its back shows over the roll and lies on the page as it
 * turns, and the roll casts a soft shadow on the page beneath. The roll is fullest mid-turn, as
 * paper is, and all shading is continuous gradients, so nothing bands or steps.
 *
 * `progress` 0 → 1 moves the fold from the free (left) edge past the binding: 0 = flat, 1 = turned.
 * `visible` (0/1) shows the curl only while a turn is under way; it stays mounted and ready at rest.
 * `leaf` draws the turning page; `under` the page that appears beneath it. Geometry is physical
 * (laid out left-to-right); the pages inside keep their right-to-left layout.
 */
const STRIPS = 14;
const PAPER = '#EDE7DD';

export const PageCurl = memo(function PageCurl({
  progress,
  visible,
  width: W,
  height: H,
  leaf,
  under,
}: {
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

  const root = useAnimatedStyle(() => ({ opacity: visible.get() }));
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
  // continuous shading over the rising roll: dark at its silhouette, a soft sheen near the fold
  const rollShade = useAnimatedStyle(() => {
    const { x, R } = geo(progress.get());
    return { left: x - R, width: R };
  });
  // the back of the paper: over the top of the roll, then lying on the page as it turns
  const back = useAnimatedStyle(() => {
    const { x, R } = geo(progress.get());
    const start = x - R * 0.42;
    const end = Math.min(W, Math.max(x + R * 0.1, 2 * x - Math.PI * R));
    return { left: start, width: Math.max(0, end - start) };
  });
  const backEdge = useAnimatedStyle(() => {
    const { x, R } = geo(progress.get());
    const end = 2 * x - Math.PI * R;
    return { left: Math.min(W, Math.max(x, end)), opacity: end > x && end < W ? 1 : 0 };
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, root]} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, styles.ltr]}>
      {/* 1 · the page beneath, and the roll's shadow on it */}
      <Animated.View style={[styles.clip, { left: 0, height: H }, underStyle]}>
        <View style={[styles.pinned, { width: W, height: H }, styles.rtl]}>{under}</View>
      </Animated.View>
      <Animated.View style={[styles.abs, { width: W * 0.38, height: H }, castShadow]}>
        <LinearGradient colors={['rgba(30,20,10,0)', 'rgba(30,20,10,0.08)', 'rgba(30,20,10,0.30)']} locations={[0, 0.55, 1]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
      {/* 2 · the leaf, flat */}
      <Animated.View style={[styles.clip, { height: H }, flat]}>
        <Animated.View style={[styles.pinned, { width: W, height: H }, flatInner]}>
          <View style={[StyleSheet.absoluteFill, styles.rtl]}>{leaf}</View>
        </Animated.View>
      </Animated.View>
      {/* 3 · the leaf rising round the roll, then its continuous shading */}
      {Array.from({ length: STRIPS }, (_, i) => (
        <Strip key={i} i={i} W={W} H={H} geo={geo} progress={progress} leaf={leaf} />
      ))}
      <Animated.View style={[styles.abs, { height: H }, rollShade]}>
        <LinearGradient
          colors={['rgba(20,15,10,0.55)', 'rgba(20,15,10,0.22)', 'rgba(255,255,255,0.10)', 'rgba(255,255,255,0)', 'rgba(20,15,10,0.06)']}
          locations={[0, 0.25, 0.62, 0.82, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      {/* 4 · the back of the paper, lit across the top of the roll */}
      <Animated.View style={[styles.abs, { height: H, backgroundColor: PAPER }, back]}>
        <LinearGradient
          colors={['rgba(70,55,40,0.32)', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0.15)', 'rgba(70,55,40,0.04)', 'rgba(70,55,40,0.10)']}
          locations={[0, 0.08, 0.2, 0.6, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View style={[styles.abs, { width: 28, height: H }, backEdge]}>
        <LinearGradient colors={['rgba(30,20,10,0.20)', 'rgba(30,20,10,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
      </View>
    </Animated.View>
  );
});

/** One fine strip of paper on the rising quarter of the roll, squeezed by its curve. */
function Strip({ i, W, H, geo, progress, leaf }: { i: number; W: number; H: number; geo: (p: number) => { x: number; R: number }; progress: SharedValue<number>; leaf: ReactNode }) {
  const span = (p: number) => {
    'worklet';
    const { x, R } = geo(p);
    const q = (R * Math.PI) / 2; // paper on the front quarter
    const s0 = (i / STRIPS) * q;
    const s1 = ((i + 1) / STRIPS) * q;
    const a = x - R * Math.sin(s1 / R);
    const b = x - R * Math.sin(s0 / R);
    return { x, s1, s0, a, b };
  };
  const box = useAnimatedStyle(() => {
    const { a, b } = span(progress.get());
    return { left: a, width: Math.max(0, b - a + 0.6) }; // a hair of overlap: no seams between strips
  });
  const inner = useAnimatedStyle(() => {
    const { x, s1, s0, a, b } = span(progress.get());
    const sx = (b - a) / (s1 - s0);
    return { transform: [{ translateX: -(x - s1) * sx }, { scaleX: sx }] };
  });
  return (
    <Animated.View style={[styles.clip, { height: H }, box]}>
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: 'left' }, inner]}>
        <View style={[StyleSheet.absoluteFill, styles.rtl]}>{leaf}</View>
      </Animated.View>
    </Animated.View>
  );
}

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
});
