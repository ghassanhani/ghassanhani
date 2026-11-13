import { LinearGradient } from 'expo-linear-gradient';
import { memo, type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { type SharedValue, interpolate, useAnimatedStyle } from 'react-native-reanimated';

/**
 * A page turning on its spine, as in a printed mushaf or a flipbook: one whole sheet rotates in
 * 3D about the binding edge, with perspective. Its front is the page being turned; once it passes
 * upright its back (plain paper) shows; the page beneath is revealed under it and takes the
 * sheet's shadow near the spine. One sheet, two faces: nothing is drawn twice side by side.
 *
 * `progress` 0 → 1: flat → turned over. `visible` (0/1) shows the turn only while one is under way.
 * `leaf` is the turning page, `under` the page beneath it. Geometry is physical; the pages inside
 * keep their right-to-left layout.
 * `fromRight`: the free edge is on the right and the sheet turns over to the left about the left
 * edge (otherwise the mirror of that).
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
  // hinge on the left: the sheet lifts towards the reader (negative rotateY) and over to the left
  const sign = fromRight ? -1 : 1;
  const origin = fromRight ? 'left' : 'right';

  // at rest the turn is out of the layout altogether: no 3D layer is kept alive between turns
  const root = useAnimatedStyle(() => ({ opacity: visible.get(), display: visible.get() > 0 ? 'flex' : 'none' }));
  const sheet = useAnimatedStyle(() => {
    const p = Math.max(0, Math.min(1, progress.get()));
    return { transform: [{ perspective: W * 3 }, { rotateY: `${sign * 180 * p}deg` }] };
  });
  // light falls off as the sheet turns away from the page (front), and grows on its back as it lands
  const frontShade = useAnimatedStyle(() => ({ opacity: interpolate(progress.get(), [0, 0.5], [0, 0.35], 'clamp') }));
  const backShade = useAnimatedStyle(() => ({ opacity: interpolate(progress.get(), [0.5, 1], [0.3, 0], 'clamp') }));
  // the sheet's shadow on the page beneath: deepest while the sheet stands over it
  const underShade = useAnimatedStyle(() => ({ opacity: Math.sin(Math.PI * Math.max(0, Math.min(1, progress.get()))) * 0.6 }));

  const shadeFromHinge = fromRight ? { start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 } } : { start: { x: 1, y: 0.5 }, end: { x: 0, y: 0.5 } };

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.ltr, root]} pointerEvents="none">
      {/* the page beneath, with the sheet's shadow along the spine */}
      <View style={[StyleSheet.absoluteFill, styles.rtl]}>{under}</View>
      <Animated.View style={[StyleSheet.absoluteFill, underShade]}>
        <LinearGradient colors={['rgba(20,15,10,0.35)', 'rgba(20,15,10,0.08)', 'rgba(20,15,10,0)']} locations={[0, 0.35, 0.8]} {...shadeFromHinge} style={StyleSheet.absoluteFill} />
      </Animated.View>

      {/* the turning sheet: front = the page, back = paper */}
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: origin }, sheet]}>
        <View style={[StyleSheet.absoluteFill, styles.face, styles.rtl]}>
          {leaf}
          <Animated.View style={[StyleSheet.absoluteFill, frontShade]}>
            <LinearGradient colors={['rgba(20,15,10,0.25)', 'rgba(20,15,10,0.05)', 'rgba(20,15,10,0.45)']} locations={[0, 0.5, 1]} {...shadeFromHinge} style={StyleSheet.absoluteFill} />
          </Animated.View>
        </View>
        <View style={[StyleSheet.absoluteFill, styles.face, styles.back, { backgroundColor: paper }]}>
          <LinearGradient colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0)', 'rgba(60,45,30,0.10)']} locations={[0, 0.4, 1]} {...shadeFromHinge} style={StyleSheet.absoluteFill} />
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }, backShade]} />
        </View>
      </Animated.View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  // the geometry is physical; the pages inside keep right-to-left (on the web the document
  // direction already does this, and react-native-web has no `direction` style)
  ltr: Platform.OS === 'web' ? {} : { direction: 'ltr' },
  rtl: Platform.OS === 'web' ? {} : { direction: 'rtl' },
  face: { backfaceVisibility: 'hidden', overflow: 'hidden' },
  back: { transform: [{ rotateY: '180deg' }] },
});
