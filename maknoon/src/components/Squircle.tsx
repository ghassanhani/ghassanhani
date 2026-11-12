import { getSvgPath } from 'figma-squircle';
import { type ReactNode, useId, useMemo, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View, type ViewProps, type ViewStyle, type StyleProp } from 'react-native';
import Svg, {
  ClipPath,
  Defs,
  Ellipse,
  FeGaussianBlur,
  Filter,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { type Blob, CORNER_SMOOTHING } from '@/theme/tokens';

export type GlowStrength = 'none' | 'glass' | 'button';

export type SquircleProps = ViewProps & {
  radius: number;
  /** solid fill colour (rgba allowed) */
  fill?: string;
  /** horizontal gradient fill, RTL-agnostic [from, to] (left → right) */
  gradient?: [string, string];
  /** soft coloured light inside the shape (blur-50 ellipses in Figma) */
  blobs?: Blob[];
  /** inner glow recipe: glass cards, CTA buttons, or none */
  glow?: GlowStrength;
  /** 1px stroke drawn on the squircle edge */
  stroke?: string;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

/**
 * A box with Figma-style corner smoothing (94%). Shapes whose radius reaches
 * half their short side are pills/circles and stay fully round.
 *
 * Everything decorative is drawn in one SVG behind the children:
 * fill → tint blobs → inner glow (white inset light, as in the canvas CSS:
 * `inset 0 4px 14px 3px #fff/.65, inset 0 4px 4px #fff/.95, inset 0 -4px 4px #fff/.65`).
 */
export function Squircle({ radius, fill, gradient, blobs, glow = 'none', stroke, style, children, onLayout, ...rest }: SquircleProps) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (!size || Math.abs(size.w - width) > 0.5 || Math.abs(size.h - height) > 0.5) setSize({ w: width, h: height });
    onLayout?.(e);
  };

  const d = useMemo(() => {
    if (!size || size.w < 1 || size.h < 1) return null;
    const r = Math.min(radius, Math.min(size.w, size.h) / 2);
    const isPill = r >= Math.min(size.w, size.h) / 2 - 0.5;
    return getSvgPath({ width: size.w, height: size.h, cornerRadius: r, cornerSmoothing: isPill ? 0 : CORNER_SMOOTHING });
  }, [size, radius]);

  const g = glow === 'glass' ? { wide: 0.65, top: 0.95, bottom: 0.65 } : glow === 'button' ? { wide: 0.35, top: 0.6, bottom: 0.35 } : null;

  return (
    <View
      {...rest}
      onLayout={handleLayout}
      // Until measured, approximate with a continuous-curve radius so the first frame is not square.
      style={[{ borderRadius: d ? 0 : radius, borderCurve: 'continuous', zIndex: 0 }, !d && fill ? { backgroundColor: fill } : null, style]}
    >
      {d && size ? (
        <View style={styles.bg} pointerEvents="none">
        <Svg width={size.w} height={size.h}>
          <Defs>
            <ClipPath id={`c${uid}`}>
              <Path d={d} />
            </ClipPath>
            {gradient ? (
              <LinearGradient id={`f${uid}`} x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={gradient[0]} />
                <Stop offset="1" stopColor={gradient[1]} />
              </LinearGradient>
            ) : null}
            {blobs?.map((b, i) => (
              <RadialGradient key={i} id={`b${uid}${i}`} cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0" stopColor={b.color} stopOpacity={b.opacity ?? 1} />
                <Stop offset="0.55" stopColor={b.color} stopOpacity={(b.opacity ?? 1) * 0.55} />
                <Stop offset="1" stopColor={b.color} stopOpacity={0} />
              </RadialGradient>
            ))}
            {g ? (
              <>
                <Filter id={`g${uid}`} x="-20%" y="-20%" width="140%" height="140%">
                  <FeGaussianBlur stdDeviation={7} />
                </Filter>
                <Filter id={`h${uid}`} x="-10%" y="-10%" width="120%" height="120%">
                  <FeGaussianBlur stdDeviation={2} />
                </Filter>
              </>
            ) : null}
          </Defs>
          <G clipPath={`url(#c${uid})`}>
            {fill || gradient ? <Path d={d} fill={gradient ? `url(#f${uid})` : fill} /> : null}
            {blobs?.map((b, i) => (
              <Ellipse
                key={i}
                cx={b.cx * size.w}
                cy={b.cy * size.h}
                rx={b.rx * size.w}
                ry={b.ry * size.h}
                fill={`url(#b${uid}${i})`}
              />
            ))}
            {g ? (
              <>
                {/* wide soft inner light, offset 4 down */}
                <Path d={d} fill="none" stroke="#FFFFFF" strokeOpacity={g.wide} strokeWidth={20} filter={`url(#g${uid})`} transform="translate(0 4)" />
                {/* crisp top highlight */}
                <Path d={d} fill="none" stroke="#FFFFFF" strokeOpacity={g.top} strokeWidth={6} filter={`url(#h${uid})`} transform="translate(0 4)" />
                {/* bottom lip */}
                <Path d={d} fill="none" stroke="#FFFFFF" strokeOpacity={g.bottom} strokeWidth={6} filter={`url(#h${uid})`} transform="translate(0 -4)" />
              </>
            ) : null}
          </G>
          {stroke ? <Path d={d} fill="none" stroke={stroke} strokeWidth={1} /> : null}
        </Svg>
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  // Behind the children on every platform (on web, positioned layers would otherwise paint above static icons).
  bg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1 },
});
