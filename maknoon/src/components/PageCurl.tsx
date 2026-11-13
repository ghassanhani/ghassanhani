import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';

/**
 * A paper page curl, as in a printed book or a flipbook: the leaf stays flat from the binding
 * (right edge) to a fold line; past the fold the paper wraps round a cylinder (drawn as narrow
 * strips, each squeezed by the cylinder's curve and shaded by its angle), its back shows over the
 * tube and lies flat on the page as it turns, and the curl casts a shadow on the page beneath.
 *
 * `progress` 0 → 1 moves the fold from the free (left) edge past the binding: 0 = page flat, 1 = turned.
 * `leaf` draws the turning page; `under` the page that appears beneath it.
 */
const STRIPS = 8;
const PAPER = '#ECE6DC';

export function PageCurl({ progress, width: W, height: H, leaf, under }: { progress: SharedValue<number>; width: number; height: number; leaf: () => ReactNode; under: ReactNode }) {
  const R = W * 0.15; // the radius of the rolled paper
  const front = (R * Math.PI) / 2; // paper on the front-facing quarter of the cylinder

  const span = W + R * 2.2;
  const fold = (p: number) => {
    'worklet';
    return Math.max(0, Math.min(1, p)) * span;
  };

  // the page beneath shows only left of the curl
  const underStyle = useAnimatedStyle(() => ({ left: 0, width: Math.max(0, fold(progress.get()) - R) }));
  const castShadow = useAnimatedStyle(() => {
    const x = fold(progress.get()) - R;
    return { left: x - W * 0.3, opacity: progress.get() > 0.001 ? 1 : 0 };
  });
  // the flat part of the leaf, from the fold to the binding
  const flat = useAnimatedStyle(() => {
    const x = fold(progress.get());
    return { left: x, width: Math.max(0, W - x) };
  });
  const flatInner = useAnimatedStyle(() => ({ transform: [{ translateX: -fold(progress.get()) }] }));
  // the back of the paper: over the top of the tube, then lying flat over the page as it turns
  const back = useAnimatedStyle(() => {
    const x = fold(progress.get());
    const end = Math.max(x, 2 * x - Math.PI * R);
    const start = x - R * 0.35;
    return { left: start, width: Math.max(0, Math.min(W, end) - start), opacity: progress.get() > 0.001 ? 1 : 0 };
  });
  const backEdgeShadow = useAnimatedStyle(() => {
    const x = fold(progress.get());
    const end = Math.max(x, 2 * x - Math.PI * R);
    return { left: Math.min(W, end), opacity: end > x + 2 && end < W ? 1 : 0 };
  });

  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', direction: 'ltr' }]} pointerEvents="none">
      {/* 1 · the next page, beneath */}
      <Animated.View style={[styles.clip, { height: H }, underStyle]}>
        <View style={{ width: W, height: H, direction: 'rtl' }}>{under}</View>
      </Animated.View>
      {/* 2 · the curl's shadow on it */}
      <Animated.View style={[styles.abs, { width: W * 0.3, height: H }, castShadow]}>
        <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.28)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
      {/* 3 · the leaf, flat from the fold to the binding */}
      <Animated.View style={[styles.clip, { height: H }, flat]}>
        <Animated.View style={[{ width: W, height: H, direction: 'rtl' }, flatInner]}>{leaf()}</Animated.View>
      </Animated.View>
      {/* 4 · the leaf rising round the curl */}
      {Array.from({ length: STRIPS }, (_, i) => (
        <Strip key={i} i={i} W={W} H={H} R={R} front={front} fold={fold} progress={progress} leaf={leaf} />
      ))}
      {/* 5 · the back of the paper */}
      <Animated.View style={[styles.abs, { height: H, backgroundColor: PAPER }, back]}>
        <LinearGradient colors={['rgba(60,50,40,0.30)', 'rgba(255,255,255,0.35)', 'rgba(60,50,40,0.06)', 'rgba(60,50,40,0.12)']} locations={[0, 0.12, 0.45, 1]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
      {/* 6 · the turned leaf's edge shades the page it lies on */}
      <Animated.View style={[styles.abs, { width: 22, height: H }, backEdgeShadow]}>
        <LinearGradient colors={['rgba(0,0,0,0.18)', 'rgba(0,0,0,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </View>
  );
}

/** One strip of paper on the rising quarter of the cylinder: squeezed by the curve, darker as it turns away. */
function Strip({ i, W, H, R, front, fold, progress, leaf }: { i: number; W: number; H: number; R: number; front: number; fold: (p: number) => number; progress: SharedValue<number>; leaf: () => ReactNode }) {
  const s0 = (i / STRIPS) * front;
  const s1 = ((i + 1) / STRIPS) * front;
  const box = useAnimatedStyle(() => {
    const x = fold(progress.get());
    const a = x - R * Math.sin(s1 / R);
    const b = x - R * Math.sin(s0 / R);
    return { left: a, width: Math.max(0, b - a), opacity: progress.get() > 0.001 ? 1 : 0 };
  });
  const inner = useAnimatedStyle(() => {
    const x = fold(progress.get());
    const a = x - R * Math.sin(s1 / R);
    const b = x - R * Math.sin(s0 / R);
    const sx = (b - a) / (s1 - s0);
    // paper x in [x − s1, x − s0] maps onto screen [a, b]
    return { transform: [{ translateX: -(x - s1) * sx }, { scaleX: sx }] };
  });
  const shade = 0.05 + 0.4 * ((i + 0.5) / STRIPS) ** 1.6;
  return (
    <Animated.View style={[styles.clip, { height: H }, box]}>
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: 'left', direction: 'rtl' }, inner]}>{leaf()}</Animated.View>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: shade }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute', top: 0 },
  clip: { position: 'absolute', top: 0, overflow: 'hidden' },
});
